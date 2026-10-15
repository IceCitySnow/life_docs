import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';

type HealthSuccessBody = {
  data: {
    status: string;
    database: string;
    timestamp: string;
  };
};

type ErrorResponseBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

describe('Phase 0 API (e2e)', () => {
  let app: INestApplication<App>;
  let databaseHealthy = true;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.API_PREFIX = 'api/v1';
    process.env.DATABASE_URL =
      'postgresql://life_exploration:life_exploration_dev@localhost:5432/life_exploration?schema=public';
    process.env.ENABLE_DEV_AUTH = 'true';
    process.env.AUTH_TOKEN_TTL_SECONDS = '3600';
    process.env.WECHAT_APP_ID = '';
    process.env.WECHAT_APP_SECRET = '';
    process.env.LOG_LEVEL = 'error';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: () => undefined,
        onModuleDestroy: () => undefined,
        $connect: () => undefined,
        $disconnect: () => undefined,
        isDatabaseHealthy: () => Promise.resolve(databaseHealthy),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    databaseHealthy = true;
  });

  it('GET /api/v1/health returns ok when database is up', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    const body = response.body as HealthSuccessBody;
    expect(body).toMatchObject({
      data: {
        status: 'ok',
        database: 'up',
      },
    });
    expect(body.data.timestamp).toEqual(expect.any(String));
  });

  it('GET /api/v1/health returns unified error when database is down', async () => {
    databaseHealthy = false;

    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(503);

    const body = response.body as ErrorResponseBody;
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(body.error.message).toBe('Database is unavailable.');
    expect(body.error.details).toBeDefined();
    expect(body).not.toHaveProperty('stack');
  });
});
