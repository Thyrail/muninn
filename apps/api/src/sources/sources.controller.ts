import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  createSourceSchema,
  LIMITS,
  type CreateSourceInput,
  type SourceDetailDto,
  type SourceDto,
} from '@muninn/shared';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SourcesService, type UploadedPdf } from './sources.service.js';

@Controller()
export class SourcesController {
  constructor(private readonly sources: SourcesService) {}

  @Get('notebooks/:notebookId/sources')
  list(
    @Session() session: UserSession,
    @Param('notebookId') notebookId: string,
  ): Promise<SourceDto[]> {
    return this.sources.list(session.user.id, notebookId);
  }

  @Post('notebooks/:notebookId/sources/file')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: LIMITS.maxFileSizeBytes, files: 1 } }),
  )
  addPdf(
    @Session() session: UserSession,
    @Param('notebookId') notebookId: string,
    @UploadedFile() file: UploadedPdf | undefined,
  ): Promise<SourceDto> {
    return this.sources.addPdf(session.user.id, notebookId, file);
  }

  @Post('notebooks/:notebookId/sources')
  add(
    @Session() session: UserSession,
    @Param('notebookId') notebookId: string,
    @Body(new ZodValidationPipe(createSourceSchema)) body: CreateSourceInput,
  ): Promise<SourceDto> {
    return this.sources.addFromInput(session.user.id, notebookId, body);
  }

  @Get('sources/:id')
  get(@Session() session: UserSession, @Param('id') id: string): Promise<SourceDetailDto> {
    return this.sources.get(session.user.id, id);
  }

  @Post('sources/:id/retry')
  retry(@Session() session: UserSession, @Param('id') id: string): Promise<SourceDto> {
    return this.sources.retry(session.user.id, id);
  }

  @Delete('sources/:id')
  @HttpCode(204)
  remove(@Session() session: UserSession, @Param('id') id: string): Promise<void> {
    return this.sources.remove(session.user.id, id);
  }
}
