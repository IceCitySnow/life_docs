import {
  isDevLoginAllowed,
  isReleaseBuild,
  validateApiBaseUrl,
} from '../config';

describe('release / production login policy', () => {
  it('disallows dev-login fallback in release builds', () => {
    expect(isDevLoginAllowed('release')).toBe(false);
    expect(isReleaseBuild('release')).toBe(true);
  });

  it('allows dev-login fallback only for develop and trial', () => {
    expect(isDevLoginAllowed('develop')).toBe(true);
    expect(isDevLoginAllowed('trial')).toBe(true);
    expect(isReleaseBuild('develop')).toBe(false);
  });

  it('rejects localhost / HTTP API targets in release mode', () => {
    expect(
      validateApiBaseUrl('http://localhost:3000/api/v1', { release: true }).ok,
    ).toBe(false);
    expect(
      validateApiBaseUrl('https://127.0.0.1/api/v1', { release: true }).ok,
    ).toBe(false);
    expect(
      validateApiBaseUrl('https://api.example.com/api/v1', { release: true }).ok,
    ).toBe(false);
  });

  it('accepts HTTPS public API hosts in release mode', () => {
    const checked = validateApiBaseUrl('https://api.life.example.org/api/v1', {
      release: true,
    });
    expect(checked.ok).toBe(true);
    if (checked.ok) {
      expect(checked.url).toBe('https://api.life.example.org/api/v1');
    }
  });
});
