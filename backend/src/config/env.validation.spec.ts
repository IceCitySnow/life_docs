import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const validConfig = {
    NODE_ENV: 'development',
    PORT: '3000',
    API_PREFIX: 'api/v1',
    DATABASE_URL:
      'postgresql://life_exploration:life_exploration_dev@localhost:5432/life_exploration?schema=public',
    LOG_LEVEL: 'debug',
    AUTH_TOKEN_TTL_SECONDS: '3600',
    ENABLE_DEV_AUTH: 'true',
    WECHAT_APP_ID: '',
    WECHAT_APP_SECRET: '',
  };

  it('accepts a complete valid configuration', () => {
    const result = validateEnv(validConfig);

    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
    expect(result.ENABLE_DEV_AUTH).toBe(true);
    expect(result.AUTH_TOKEN_TTL_SECONDS).toBe(3600);
  });

  it('fails clearly when DATABASE_URL is missing', () => {
    const withoutDb = {
      NODE_ENV: validConfig.NODE_ENV,
      PORT: validConfig.PORT,
      API_PREFIX: validConfig.API_PREFIX,
      LOG_LEVEL: validConfig.LOG_LEVEL,
    };

    expect(() => validateEnv(withoutDb)).toThrow(
      /Missing required environment variable: DATABASE_URL/,
    );
  });

  it('rejects ENABLE_DEV_AUTH in production', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        NODE_ENV: 'production',
        ENABLE_DEV_AUTH: 'true',
        WECHAT_APP_ID: 'wx123',
        WECHAT_APP_SECRET: 'secret',
      }),
    ).toThrow(/ENABLE_DEV_AUTH cannot be enabled when NODE_ENV=production/);
  });

  it('requires WeChat credentials in production', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        NODE_ENV: 'production',
        ENABLE_DEV_AUTH: 'false',
        WECHAT_APP_ID: '',
        WECHAT_APP_SECRET: '',
      }),
    ).toThrow(/WECHAT_APP_ID/);
  });

  it('does not include secret values in validation errors', () => {
    const secret = 'postgresql://user:super-secret-password@localhost:5432/db';

    try {
      validateEnv({
        ...validConfig,
        DATABASE_URL: 'not-a-uri',
      });
      fail('expected validation to throw');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain('super-secret-password');
      expect(message).not.toContain(secret);
      expect(message).toMatch(/DATABASE_URL/);
    }
  });
});
