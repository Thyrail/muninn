import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  createNotebookSchema,
  renameNotebookSchema,
  type CreateNotebookInput,
  type NotebookSummary,
  type RenameNotebookInput,
  type SuggestedQuestionsDto,
} from '@muninn/shared';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { NotebooksService } from './notebooks.service.js';
import { SuggestionsService } from './suggestions.service.js';

@Controller('notebooks')
export class NotebooksController {
  constructor(
    private readonly notebooks: NotebooksService,
    private readonly suggestions: SuggestionsService,
  ) {}

  @Get()
  list(@Session() session: UserSession): Promise<NotebookSummary[]> {
    return this.notebooks.list(session.user.id);
  }

  @Post()
  create(
    @Session() session: UserSession,
    @Body(new ZodValidationPipe(createNotebookSchema)) body: CreateNotebookInput,
  ): Promise<NotebookSummary> {
    return this.notebooks.create(session.user.id, body);
  }

  @Get(':id')
  get(@Session() session: UserSession, @Param('id') id: string): Promise<NotebookSummary> {
    return this.notebooks.get(session.user.id, id);
  }

  @Get(':id/suggestions')
  suggest(
    @Session() session: UserSession,
    @Param('id') id: string,
  ): Promise<SuggestedQuestionsDto> {
    return this.suggestions.get(session.user.id, id);
  }

  @Patch(':id')
  rename(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(renameNotebookSchema)) body: RenameNotebookInput,
  ): Promise<NotebookSummary> {
    return this.notebooks.rename(session.user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Session() session: UserSession, @Param('id') id: string): Promise<void> {
    return this.notebooks.remove(session.user.id, id);
  }
}
