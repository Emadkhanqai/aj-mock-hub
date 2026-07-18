import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type {
  ApiErrorCode,
  ApiErrorDetail,
  ApiErrorResponse,
} from '@aj-mock-hub/contracts';
import type { Response } from 'express';

interface ExceptionPayload {
  code?: ApiErrorCode;
  message?: string | string[];
  details?: ApiErrorDetail[];
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const isHttpException = exception instanceof HttpException;
    let status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = isHttpException
      ? this.asPayload(exception.getResponse())
      : undefined;

    if (!isHttpException && this.isDatabaseUnavailable(exception)) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
    }

    const body: ApiErrorResponse = {
      error: {
        code:
          payload?.code ??
          (status === HttpStatus.SERVICE_UNAVAILABLE
            ? 'DATABASE_UNAVAILABLE'
            : 'INTERNAL_ERROR'),
        message:
          this.singleMessage(payload?.message) ??
          (status === HttpStatus.SERVICE_UNAVAILABLE
            ? 'The database is temporarily unavailable.'
            : 'An unexpected error occurred.'),
        ...(payload?.details ? { details: payload.details } : {}),
      },
    };

    if (!isHttpException) {
      this.logger.error(
        'Unhandled API exception',
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json(body);
  }

  private asPayload(response: string | object): ExceptionPayload {
    return typeof response === 'string' ? { message: response } : response;
  }

  private singleMessage(message?: string | string[]): string | undefined {
    return Array.isArray(message) ? message[0] : message;
  }

  private isDatabaseUnavailable(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      [
        'PrismaClientInitializationError',
        'PrismaClientRustPanicError',
      ].includes(exception.name)
    );
  }
}
