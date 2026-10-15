import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  sanitizeRequestUrl,
  type RequestWithContext,
} from '../logging/request-context';

type ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithContext>();
    const requestId = request.requestId;
    const safeUrl = sanitizeRequestUrl(request.originalUrl || request.url);

    const { status, body } = this.toErrorResponse(exception, requestId);

    this.logger.error(
      `${requestId ?? '-'} ${request.method} ${safeUrl} -> ${status} ${body.error.code}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json(body);
  }

  private toErrorResponse(
    exception: unknown,
    requestId?: string,
  ): {
    status: number;
    body: ErrorBody;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        return {
          status,
          body: {
            error: {
              code: this.codeFromStatus(status),
              message: exceptionResponse,
              requestId,
            },
          },
        };
      }

      const payload = exceptionResponse as Record<string, unknown>;
      const message = this.extractMessage(payload);

      return {
        status,
        body: {
          error: {
            code:
              typeof payload.code === 'string'
                ? payload.code
                : this.codeFromStatus(status),
            message,
            details: payload.details,
            requestId,
          },
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred.',
          requestId,
        },
      },
    };
  }

  private extractMessage(payload: Record<string, unknown>): string {
    if (typeof payload.message === 'string') {
      return payload.message;
    }

    if (Array.isArray(payload.message)) {
      return payload.message.map(String).join('; ');
    }

    return 'Request failed.';
  }

  private codeFromStatus(status: number): string {
    const statusCodes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
    };

    return statusCodes[status] ?? 'HTTP_ERROR';
  }
}
