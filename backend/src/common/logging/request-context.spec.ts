import {
  redactAuthorizationHeader,
  sanitizeRequestUrl,
} from './request-context';

describe('request-context helpers', () => {
  it('redacts sensitive query parameters', () => {
    expect(
      sanitizeRequestUrl('/api/v1/auth/wechat?code=secret-code&page=1'),
    ).toBe('/api/v1/auth/wechat?code=[REDACTED]&page=1');
  });

  it('leaves paths without query untouched', () => {
    expect(sanitizeRequestUrl('/api/v1/health')).toBe('/api/v1/health');
  });

  it('redacts bearer tokens', () => {
    expect(redactAuthorizationHeader('Bearer abc.def')).toBe(
      'Bearer [REDACTED]',
    );
  });
});
