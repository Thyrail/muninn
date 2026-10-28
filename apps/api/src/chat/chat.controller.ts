import { Body, Controller, Delete, Get, HttpCode, Param, Post, Res } from '@nestjs/common';
import { chatRequestSchema, type ChatMessageDto, type ChatRequest } from '@muninn/shared';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { pipeUIMessageStreamToResponse } from 'ai';
import type { Response } from 'express';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ChatService } from './chat.service.js';

@Controller('notebooks/:notebookId')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('messages')
  history(
    @Session() session: UserSession,
    @Param('notebookId') notebookId: string,
  ): Promise<ChatMessageDto[]> {
    return this.chat.history(session.user.id, notebookId);
  }

  @Delete('messages')
  @HttpCode(204)
  clear(@Session() session: UserSession, @Param('notebookId') notebookId: string): Promise<void> {
    return this.chat.clear(session.user.id, notebookId);
  }

  /** Streams the answer in the AI SDK UI message stream format (consumed by `useChat`). */
  @Post('chat')
  async ask(
    @Session() session: UserSession,
    @Param('notebookId') notebookId: string,
    @Body(new ZodValidationPipe(chatRequestSchema)) body: ChatRequest,
    @Res() response: Response,
  ): Promise<void> {
    // Stop generating (and paying for) tokens when the client goes away, e.g. on "Stop".
    const abort = new AbortController();
    response.on('close', () => {
      if (!response.writableEnded) abort.abort();
    });
    const stream = await this.chat.ask(session.user.id, notebookId, body, abort.signal);
    await pipeUIMessageStreamToResponse({ response, stream });
  }
}
