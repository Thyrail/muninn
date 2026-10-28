import { Global, Module } from '@nestjs/common';
import { API_ENV, loadEnv } from './env.js';

@Global()
@Module({
  providers: [{ provide: API_ENV, useFactory: () => loadEnv() }],
  exports: [API_ENV],
})
export class ConfigModule {}
