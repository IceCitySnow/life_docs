import { Injectable } from '@nestjs/common';

export type AppConfig = {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  API_PREFIX: string;
  DATABASE_URL: string;
  LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  AUTH_TOKEN_TTL_SECONDS: number;
  ENABLE_DEV_AUTH: boolean;
  WECHAT_APP_ID: string;
  WECHAT_APP_SECRET: string;
};

@Injectable()
export class AppConfigService {
  constructor(private readonly config: AppConfig) {}

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  getOrThrow<K extends keyof AppConfig>(key: K): AppConfig[K] {
    const value = this.config[key];
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing configuration value: ${String(key)}`);
    }
    return value;
  }

  isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  isDevAuthEnabled(): boolean {
    return this.config.ENABLE_DEV_AUTH && !this.isProduction();
  }
}
