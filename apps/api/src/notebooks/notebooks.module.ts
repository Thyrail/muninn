import { Module } from '@nestjs/common';
import { NotebooksController } from './notebooks.controller.js';
import { NotebooksService } from './notebooks.service.js';

@Module({
  controllers: [NotebooksController],
  providers: [NotebooksService],
})
export class NotebooksModule {}
