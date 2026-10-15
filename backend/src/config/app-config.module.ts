import { Global, Module } from '@nestjs/common';
import { config as loadDotenv } from 'dotenv';
import { AppConfig, AppConfigService } from './app-config.service';
import { validateEnv } from './env.validation';

function loadAppConfig(): AppConfig {
  loadDotenv({ quiet: true });
  return validateEnv(process.env) as AppConfig;
}

@Global()
@Module({
  providers: [
    {
      provide: AppConfigService,
      useFactory: () => new AppConfigService(loadAppConfig()),
    },
  ],
  exports: [AppConfigService],
})
export class AppConfigModule {}
