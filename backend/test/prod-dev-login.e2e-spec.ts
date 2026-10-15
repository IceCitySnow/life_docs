import {
  BadRequestException,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, UserStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { WechatService } from '../src/auth/wechat.service';

/**
 * API-06: production-like config must refuse /auth/dev-login
 * without creating users or sessions.
 */
describe('Production auth: no dev-login (e2e)', () => {
  let app: INestApplication<App>;
  let sessionCreateCount = 0;
  let userCreateCount = 0;

  const users = new Map<
    string,
    {
      id: string;
      wxOpenId: string;
      displayName: string | null;
      avatarUrl: string | null;
      role: UserRole;
      status: UserStatus;
      createdAt: Date;
      updatedAt: Date;
    }
  >();

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.API_PREFIX = 'api/v1';
    process.env.DATABASE_URL =
      'postgresql://life_exploration:life_exploration_dev@localhost:5432/life_exploration?schema=public';
    process.env.LOG_LEVEL = 'error';
    // Production-equivalent: never enable dev auth.
    process.env.ENABLE_DEV_AUTH = 'false';
    process.env.AUTH_TOKEN_TTL_SECONDS = '3600';
    process.env.WECHAT_APP_ID = 'wx-test';
    process.env.WECHAT_APP_SECRET = 'wx-secret';

    const prismaMock = {
      onModuleInit: () => undefined,
      onModuleDestroy: () => undefined,
      $connect: () => undefined,
      $disconnect: () => undefined,
      isDatabaseHealthy: () => Promise.resolve(true),
      user: {
        findUnique: ({
          where,
        }: {
          where: { wxOpenId?: string; id?: string };
        }) => {
          if (where.wxOpenId) {
            return Promise.resolve(users.get(where.wxOpenId) ?? null);
          }
          if (where.id) {
            return Promise.resolve(
              [...users.values()].find((user) => user.id === where.id) ?? null,
            );
          }
          return Promise.resolve(null);
        },
        create: ({
          data,
        }: {
          data: {
            wxOpenId: string;
            displayName?: string;
            role: UserRole;
            status: UserStatus;
          };
        }) => {
          userCreateCount += 1;
          const created = {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            wxOpenId: data.wxOpenId,
            displayName: data.displayName ?? null,
            avatarUrl: null as string | null,
            role: data.role,
            status: data.status,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          users.set(created.wxOpenId, created);
          return Promise.resolve(created);
        },
      },
      authSession: {
        create: () => {
          sessionCreateCount += 1;
          return Promise.resolve({ id: 'session-should-not-exist' });
        },
        findUnique: () => Promise.resolve(null),
        updateMany: () => Promise.resolve({ count: 0 }),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(WechatService)
      .useValue({
        exchangeCode: () => Promise.reject(new Error('wechat unavailable')),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors: ValidationError[]) =>
          new BadRequestException({
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters.',
            details: errors.map((error) => ({
              field: error.property,
              message: Object.values(error.constraints ?? {})[0] ?? 'Invalid',
            })),
          }),
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects /auth/dev-login without creating a user or session', async () => {
    sessionCreateCount = 0;
    userCreateCount = 0;

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-login')
      .send({ wxOpenId: 'prod-should-not-login' })
      .expect(404);

    expect(response.body).toMatchObject({
      error: { code: 'NOT_FOUND' },
    });
    expect(response.body).not.toHaveProperty('data.accessToken');
    expect(userCreateCount).toBe(0);
    expect(sessionCreateCount).toBe(0);
    expect(users.size).toBe(0);
  });
});
