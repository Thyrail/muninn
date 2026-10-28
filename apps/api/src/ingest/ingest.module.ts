import { Module } from '@nestjs/common';
import { IngestProcessor } from './ingest.processor.js';

@Module({
  providers: [IngestProcessor],
})
export class IngestModule {}
