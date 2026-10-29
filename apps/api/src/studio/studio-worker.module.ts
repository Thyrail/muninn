import { Module } from '@nestjs/common';
import { StudioProcessor } from './studio.processor.js';

@Module({
  providers: [StudioProcessor],
})
export class StudioWorkerModule {}
