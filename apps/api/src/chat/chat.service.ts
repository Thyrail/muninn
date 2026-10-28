import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import type { ChatMessage, Prisma, PrismaClient } from '@muninn/db';
import {
  CITATIONS_DATA_PART,
  LIMITS,
  parseCitations,
  RATE_LIMITS,
  type ChatMessageDto,
  type ChatRequest,
  type CitationDto,
  type CitationsData,
} from '@muninn/shared';
import {
  createUIMessageStream,
  streamText,
  toUIMessageStream,
  type ToolSet,
  type UIMessage,
  type UIMessageChunk,
} from 'ai';
import { AiService } from '../ai/ai.service.js';
import { findOwnedNotebook } from '../notebooks/ownership.js';
import { PRISMA } from '../prisma/prisma.module.js';
import { RateLimitService, type RateLimitRule } from '../rate-limit/rate-limit.service.js';
import { buildChatMessages, buildSearchQuery, CHAT_SYSTEM_PROMPT } from './prompt.js';
import { RetrievalService, type RetrievedChunk } from './retrieval.service.js';

export type ChatUIMessage = UIMessage<never, { [CITATIONS_DATA_PART]: CitationsData }>;

const CHAT_RATE_LIMIT: RateLimitRule = {
  name: 'chat',
  limit: RATE_LIMITS.chatMessagesPerHour,
  windowMs: 60 * 60 * 1000,
  message: `Du hast das Limit von ${RATE_LIMITS.chatMessagesPerHour} Fragen pro Stunde erreicht. Bitte versuche es später erneut.`,
};

const ANSWER_FAILED = 'Die Antwort konnte nicht erstellt werden. Bitte versuche es erneut.';
const ANSWER_REFUSED = 'Auf diese Frage kann Muninn leider nicht antworten.';
const MAX_OUTPUT_TOKENS = 2048;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly ai: AiService,
    private readonly retrieval: RetrievalService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async history(userId: string, notebookId: string): Promise<ChatMessageDto[]> {
    await findOwnedNotebook(this.prisma, userId, notebookId);
    const messages = await this.prisma.chatMessage.findMany({
      where: { notebookId },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map(toChatMessageDto);
  }

  async clear(userId: string, notebookId: string): Promise<void> {
    await findOwnedNotebook(this.prisma, userId, notebookId);
    await this.prisma.chatMessage.deleteMany({ where: { notebookId } });
  }

  /**
   * Validates and stores the question, retrieves passages and returns the answer as a UI
   * message stream. Everything that can fail with a normal HTTP error happens before the
   * stream starts; errors while streaming arrive as an `error` chunk.
   */
  async ask(
    userId: string,
    notebookId: string,
    request: ChatRequest,
    abortSignal: AbortSignal,
  ): Promise<ReadableStream<UIMessageChunk>> {
    await findOwnedNotebook(this.prisma, userId, notebookId);
    const sources = await this.prisma.source.findMany({
      where: { notebookId, id: { in: request.sourceIds }, status: 'READY' },
      select: { id: true },
    });
    if (sources.length === 0) {
      throw new BadRequestException('Wähle mindestens eine fertige Quelle aus.');
    }
    await this.rateLimit.consume(CHAT_RATE_LIMIT, userId);

    const history = await this.storeQuestion(notebookId, request.text);
    const chunks = await this.retrieval.retrieve(
      { notebookId, sourceIds: sources.map((source) => source.id) },
      buildSearchQuery(history, request.text),
    );
    const candidates = chunks.map(toCitation);

    return createUIMessageStream<ChatUIMessage>({
      execute: async ({ writer }) => {
        const messageId = randomUUID();
        writer.write({ type: 'start', messageId });
        // All candidates first, so citation badges get their preview while the text streams.
        writer.write({
          type: `data-${CITATIONS_DATA_PART}`,
          id: CITATIONS_DATA_PART,
          data: { citations: candidates },
        });

        const result = streamText({
          model: this.ai.chatModel,
          system: CHAT_SYSTEM_PROMPT,
          messages: buildChatMessages(history, request.text, chunks),
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          maxRetries: 2,
          abortSignal,
          providerOptions: {
            // Answers from given passages need little reasoning: faster and cheaper (ADR-014).
            anthropic: { effort: 'low' },
            google: { thinkingConfig: { thinkingLevel: 'low' } },
          },
        });

        let text = '';
        const answer = toUIMessageStream<ToolSet, ChatUIMessage>({
          stream: result.stream,
          sendStart: false,
          sendFinish: false,
          onError: (error) => {
            this.logger.error({ err: error, notebookId }, 'Chat answer failed');
            return ANSWER_FAILED;
          },
        });
        for await (const chunk of answer) {
          if (chunk.type === 'text-delta') text += chunk.delta;
          writer.write(chunk);
        }

        const finishReason = await Promise.resolve(result.finishReason).catch(() => undefined);
        if (finishReason === 'content-filter' && !text.trim()) {
          writer.write({ type: 'error', errorText: ANSWER_REFUSED });
        }

        // Drop citation numbers that do not exist and keep only the cited passages.
        const parsed = parseCitations(text, candidates.length);
        const cited = candidates.filter((citation) => parsed.cited.includes(citation.n));
        writer.write({
          type: `data-${CITATIONS_DATA_PART}`,
          id: CITATIONS_DATA_PART,
          data: { citations: cited },
        });
        if (parsed.text.trim()) {
          await this.prisma.chatMessage.create({
            data: {
              id: messageId,
              notebookId,
              role: 'ASSISTANT',
              content: parsed.text,
              citations: cited as unknown as Prisma.InputJsonValue,
            },
          });
        }
        writer.write({ type: 'finish' });
      },
      onError: (error) => {
        this.logger.error({ err: error, notebookId }, 'Chat stream failed');
        return ANSWER_FAILED;
      },
    });
  }

  /**
   * Persists the question and returns the history before it. If the latest message is the
   * same unanswered question (the client retries after a failed answer), it is reused.
   */
  private async storeQuestion(notebookId: string, text: string) {
    const recent = await this.prisma.chatMessage.findMany({
      where: { notebookId },
      orderBy: { createdAt: 'desc' },
      take: LIMITS.chatHistoryMessages + 1,
      select: { role: true, content: true },
    });
    const latest = recent[0];
    if (latest?.role === 'USER' && latest.content === text) {
      recent.shift();
    } else {
      await this.prisma.$transaction([
        this.prisma.chatMessage.create({ data: { notebookId, role: 'USER', content: text } }),
        this.prisma.notebook.update({ where: { id: notebookId }, data: { updatedAt: new Date() } }),
      ]);
    }
    return recent.slice(0, LIMITS.chatHistoryMessages).reverse();
  }
}

function toCitation(chunk: RetrievedChunk, index: number): CitationDto {
  return {
    n: index + 1,
    chunkId: chunk.id,
    sourceId: chunk.sourceId,
    sourceTitle: chunk.sourceTitle,
    page: chunk.page,
    charStart: chunk.charStart,
    charEnd: chunk.charEnd,
    excerpt: chunk.content,
  };
}

function toChatMessageDto(message: ChatMessage): ChatMessageDto {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    citations: message.citations as unknown as CitationDto[],
    createdAt: message.createdAt.toISOString(),
  };
}
