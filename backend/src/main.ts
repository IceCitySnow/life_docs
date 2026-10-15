import {
  BadRequestException,
  Logger,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppConfigService } from './config/app-config.service';

function formatValidationErrors(errors: ValidationError[]) {
  return errors.flatMap((error) => {
    const messages = error.constraints
      ? Object.values(error.constraints)
      : ['Invalid value'];
    return messages.map((message) => ({
      field: error.property,
      message,
    }));
  });
}

function nestLogLevels(
  level: string,
): Array<'error' | 'warn' | 'log' | 'debug' | 'verbose'> {
  switch (level) {
    case 'fatal':
    case 'error':
      return ['error'];
    case 'warn':
      return ['error', 'warn'];
    case 'debug':
    case 'trace':
      return ['error', 'warn', 'log', 'debug', 'verbose'];
    case 'info':
    default:
      return ['error', 'warn', 'log'];
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(AppConfigService);
  const port = configService.getOrThrow('PORT');
  const apiPrefix = configService.getOrThrow('API_PREFIX');
  const logLevel = configService.get('LOG_LEVEL');

  app.useLogger(nestLogLevels(logLevel));
  app.setGlobalPrefix(apiPrefix);

  // Behind nginx/Caddy TLS termination in production.
  if (configService.isProduction()) {
    const httpAdapter = app.getHttpAdapter();
    const instance = httpAdapter.getInstance() as {
      set?: (key: string, value: unknown) => void;
    };
    instance.set?.('trust proxy', 1);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters.',
          details: formatValidationErrors(errors),
        }),
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(
    `API listening on port ${port}/${apiPrefix} (env=${configService.get('NODE_ENV')})`,
  );
}

void bootstrap();
