import { pipeline } from 'node:stream/promises';
import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Post, Res } from '@nestjs/common';
import {
  createStudioOutputSchema,
  type CreateStudioOutputInput,
  type StudioOutputDto,
} from '@muninn/shared';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { StudioService } from './studio.service.js';

/** Single byte range as sent by audio elements, e.g. `bytes=0-` or `bytes=1000-1999`. */
const BYTE_RANGE = /^bytes=\d*-\d*$/;

@Controller()
export class StudioController {
  constructor(private readonly studio: StudioService) {}

  @Get('notebooks/:notebookId/studio')
  list(
    @Session() session: UserSession,
    @Param('notebookId') notebookId: string,
  ): Promise<StudioOutputDto[]> {
    return this.studio.list(session.user.id, notebookId);
  }

  @Post('notebooks/:notebookId/studio')
  create(
    @Session() session: UserSession,
    @Param('notebookId') notebookId: string,
    @Body(new ZodValidationPipe(createStudioOutputSchema)) body: CreateStudioOutputInput,
  ): Promise<StudioOutputDto> {
    return this.studio.create(session.user.id, notebookId, body);
  }

  @Delete('studio/:id')
  @HttpCode(204)
  remove(@Session() session: UserSession, @Param('id') id: string): Promise<void> {
    return this.studio.remove(session.user.id, id);
  }

  /** Streams the MP3 with range support, so the player can seek. */
  @Get('studio/:id/audio')
  async audio(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Headers('range') range: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const validRange = range && BYTE_RANGE.test(range) ? range : undefined;
    const audio = await this.studio.audio(session.user.id, id, validRange);
    response.status(audio.contentRange ? 206 : 200);
    response.setHeader('Content-Type', 'audio/mpeg');
    response.setHeader('Accept-Ranges', 'bytes');
    response.setHeader('Cache-Control', 'private, max-age=3600');
    if (audio.contentLength !== undefined)
      response.setHeader('Content-Length', audio.contentLength);
    if (audio.contentRange) response.setHeader('Content-Range', audio.contentRange);
    await pipeline(audio.body, response);
  }
}
