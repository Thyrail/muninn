import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '@muninn/db';
import { suggestedQuestionsSchema, type SuggestedQuestionsDto } from '@muninn/shared';
import { generateText, Output } from 'ai';
import { AiService } from '../ai/ai.service.js';
import { PRISMA } from '../prisma/prisma.module.js';
import { RateLimitService } from '../rate-limit/rate-limit.service.js';
import { findOwnedNotebook } from './ownership.js';
import {
  buildSuggestionsPrompt,
  SUGGESTION_EXCERPT_CHARS,
  SUGGESTIONS_SYSTEM_PROMPT,
  suggestionsKey,
  type SuggestionSource,
} from './suggestions.js';

/**
 * Three suggested questions per notebook, generated on request and cached per set of READY
 * sources. Adding, finishing or deleting a source changes the key and yields fresh questions;
 * otherwise no model call happens. Failures and an exhausted daily budget return an empty list,
 * never an error.
 */
@Injectable()
export class SuggestionsService {
  private readonly logger = new Logger(SuggestionsService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly ai: AiService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async get(userId: string, notebookId: string): Promise<SuggestedQuestionsDto> {
    const notebook = await findOwnedNotebook(this.prisma, userId, notebookId);
    const sources = await this.prisma.$queryRaw<(SuggestionSource & { id: string })[]>`
      SELECT id, title, coalesce(summary, left("extractedText", ${SUGGESTION_EXCERPT_CHARS})) AS excerpt
      FROM source
      WHERE "notebookId" = ${notebookId} AND status = 'READY'
      ORDER BY "createdAt"`;
    if (sources.length === 0) return { questions: [] };

    const key = suggestionsKey(sources.map((source) => source.id));
    if (notebook.suggestionsKey === key) return { questions: notebook.suggestedQuestions };

    const model = this.ai.summaryModel;
    if (!model || !(await this.rateLimit.tryConsumeLlmBudget())) return { questions: [] };
    try {
      const { output } = await generateText({
        model,
        system: SUGGESTIONS_SYSTEM_PROMPT,
        prompt: buildSuggestionsPrompt(sources.map(({ title, excerpt }) => ({ title, excerpt }))),
        output: Output.object({ schema: suggestedQuestionsSchema }),
        maxOutputTokens: 1024,
        maxRetries: 2,
        providerOptions: { google: { thinkingConfig: { thinkingLevel: 'minimal' } } },
      });
      await this.prisma.notebook.update({
        where: { id: notebookId },
        // Keep `updatedAt`: suggestions are derived data, not an edit of the notebook.
        data: {
          suggestedQuestions: output.questions,
          suggestionsKey: key,
          updatedAt: notebook.updatedAt,
        },
      });
      return { questions: output.questions };
    } catch (error) {
      this.logger.warn({ err: error, notebookId }, 'Suggested questions failed');
      return { questions: [] };
    }
  }
}
