import { Global, Module } from '@nestjs/common';
import { IngestQueue } from './ingest-queue.js';
import { StudioQueue } from './studio-queue.js';

@Global()
@Module({
  providers: [IngestQueue, StudioQueue],
  exports: [IngestQueue, StudioQueue],
})
export class QueueModule {}
