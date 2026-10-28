// Background worker entry point (BullMQ consumers for ingestion and studio jobs from phase 2 on).
// Shares the API image; started with `node dist/worker.js`.
import 'reflect-metadata';
import { pino } from 'pino';
import { loadEnv } from './config/env.js';

const env = loadEnv();
const logger = pino({ level: env.LOG_LEVEL, base: { service: 'worker' } });

logger.info('Worker started, no queues registered yet');

const keepAlive = setInterval(() => undefined, 60_000);

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, 'Worker shutting down');
  clearInterval(keepAlive);
  process.exit(0);
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
