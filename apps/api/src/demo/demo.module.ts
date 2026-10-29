import { Module } from '@nestjs/common';
import { DemoResetScheduler } from './demo-reset.scheduler.js';
import { DemoResetService } from './demo-reset.service.js';

/** The reset itself, usable from the worker and the manual entry point. */
@Module({
  providers: [DemoResetService],
  exports: [DemoResetService],
})
export class DemoModule {}

/** Worker side: schedules the nightly reset. */
@Module({
  imports: [DemoModule],
  providers: [DemoResetScheduler],
})
export class DemoWorkerModule {}
