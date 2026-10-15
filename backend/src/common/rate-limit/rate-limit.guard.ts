import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from '../../auth/auth.types';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator';

type Bucket = {
  timestamps: number[];
};

/**
 * Simple in-process rate limiter for write endpoints.
 * Suitable for single-instance Phase 6; replace with Redis later if needed.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<
      RateLimitOptions | undefined
    >(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
    if (!options) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const subject =
      request.user?.id ||
      request.ip ||
      request.headers['x-forwarded-for']?.toString() ||
      'anonymous';
    const prefix =
      options.key ?? `${context.getClass().name}.${context.getHandler().name}`;
    const bucketKey = `${prefix}:${subject}`;
    const now = Date.now();
    const windowStart = now - options.windowMs;

    const bucket = this.buckets.get(bucketKey) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((ts) => ts >= windowStart);

    if (bucket.timestamps.length >= options.limit) {
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.timestamps.push(now);
    this.buckets.set(bucketKey, bucket);
    return true;
  }
}
