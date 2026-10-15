import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import {
  ensureRequestId,
  sanitizeRequestUrl,
  type RequestWithContext,
} from './request-context';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(
    request: RequestWithContext,
    response: Response,
    next: NextFunction,
  ): void {
    const requestId = ensureRequestId(request);
    response.setHeader('X-Request-Id', requestId);

    const startedAt = Date.now();
    const path = sanitizeRequestUrl(request.originalUrl || request.url);

    response.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      this.logger.log(
        `${requestId} ${request.method} ${path} ${response.statusCode} ${durationMs}ms`,
      );
    });

    next();
  }
}
