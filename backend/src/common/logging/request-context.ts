import { randomUUID } from 'crypto';
import type { Request } from 'express';

export type RequestWithContext = Request & {
  requestId?: string;
};

const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'access_token',
  'accessToken',
  'code',
  'password',
  'secret',
]);

export function ensureRequestId(request: RequestWithContext): string {
  const headerValue = request.headers['x-request-id'];
  const fromHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const requestId =
    typeof fromHeader === 'string' && fromHeader.trim()
      ? fromHeader.trim().slice(0, 128)
      : randomUUID();
  request.requestId = requestId;
  return requestId;
}

/** Safe path for logs: drop sensitive query values. */
export function sanitizeRequestUrl(url: string): string {
  const question = url.indexOf('?');
  if (question < 0) {
    return url;
  }

  const path = url.slice(0, question);
  const search = url.slice(question + 1);
  const parts = search.split('&').filter(Boolean);
  const redacted = parts.map((part) => {
    const eq = part.indexOf('=');
    const key = eq >= 0 ? part.slice(0, eq) : part;
    if (SENSITIVE_QUERY_KEYS.has(decodeURIComponent(key))) {
      return `${key}=[REDACTED]`;
    }
    return part;
  });

  return redacted.length ? `${path}?${redacted.join('&')}` : path;
}

export function redactAuthorizationHeader(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) {
    return undefined;
  }
  if (/^bearer\s+/i.test(value)) {
    return 'Bearer [REDACTED]';
  }
  return '[REDACTED]';
}
