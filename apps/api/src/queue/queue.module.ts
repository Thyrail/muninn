import { Global, Module } from '@nestjs/common';
import { IngestQueue } from './ingest-queue.js';

@Global()
@Module({
  providers: [IngestQueue],
  exports: [IngestQueue],
})
export class QueueModule {}
