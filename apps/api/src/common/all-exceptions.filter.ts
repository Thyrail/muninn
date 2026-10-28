import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { LIMITS } from '@muninn/shared';
import type { Response } from 'express';

export interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
}

/** Maps any thrown value to a stable JSON error body. Internal details never reach the client. */
/** German messages for statuses whose default text comes from third-party middleware. */
const MESSAGE_OVERRIDES: Partial<Record<number, string>> = {
  [HttpStatus.PAYLOAD_TOO_LARGE]: `Die Datei ist zu groß. Erlaubt sind höchstens ${LIMITS.maxFileSizeBytes / 1024 / 1024} MB.`,
};

export function toErrorBody(exception: unknown): ErrorBody {
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const response = exception.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : ((response as { message?: string | string[] }).message ?? exception.message);
    return {
      statusCode,
      error: HttpStatus[statusCode] ?? 'Error',
      message: MESSAGE_OVERRIDES[statusCode] ?? message,
    };
  }
  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Ein unerwarteter Fehler ist aufgetreten.',
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = toErrorBody(exception);

    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    if (response.headersSent) return;
    response.status(body.statusCode).json(body);
  }
}
