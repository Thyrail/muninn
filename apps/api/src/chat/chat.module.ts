import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { RetrievalService } from './retrieval.service.js';

@Module({
  controllers: [ChatController],
  providers: [ChatService, RetrievalService],
})
export class ChatModule {}
