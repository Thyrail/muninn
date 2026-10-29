import { Module } from '@nestjs/common';
import { NotebooksController } from './notebooks.controller.js';
import { NotebooksService } from './notebooks.service.js';
import { SuggestionsService } from './suggestions.service.js';

@Module({
  controllers: [NotebooksController],
  providers: [NotebooksService, SuggestionsService],
})
export class NotebooksModule {}
