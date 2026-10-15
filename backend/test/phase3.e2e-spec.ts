import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskStatus, UserRole, UserStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Phase 3 personal exploration loop (e2e)', () => {
  let app: INestApplication<App>;
  const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const taskId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  const userTasks = new Map<string, Record<string, unknown>>();
  const records = new Map<string, Record<string, unknown>>();

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.API_PREFIX = 'api/v1';
    process.env.DATABASE_URL =
      'postgresql://life_exploration:life_exploration_dev@localhost:5432/life_exploration?schema=public';
    process.env.LOG_LEVEL = 'error';
    process.env.ENABLE_DEV_AUTH = 'true';
    process.env.AUTH_TOKEN_TTL_SECONDS = '3600';
    process.env.WECHAT_APP_ID = '';
    process.env.WECHAT_APP_SECRET = '';

    const authGuardMock: CanActivate = {
      canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest<{ user?: unknown }>();
        request.user = {
          id: userId,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          displayName: 'Explorer',
          avatarUrl: null,
          sessionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        };
        return true;
      },
    };

    const prismaMock = {
      onModuleInit: () => undefined,
      onModuleDestroy: () => undefined,
      $connect: () => undefined,
      $disconnect: () => undefined,
      isDatabaseHealthy: () => Promise.resolve(true),
      $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
      task: {
        findFirst: ({
          where,
        }: {
          where: { id: string; status?: TaskStatus };
        }) =>
          Promise.resolve(
            where.id === taskId && where.status === TaskStatus.PUBLISHED
              ? {
                  id: taskId,
                  title: 'Watch sunrise',
                  status: TaskStatus.PUBLISHED,
                }
              : null,
          ),
        count: () => Promise.resolve(3),
        findUnique: () =>
          Promise.resolve({ id: taskId, title: 'Watch sunrise' }),
      },
      userTask: {
        findUnique: ({
          where,
        }: {
          where: { userId_taskId: { userId: string; taskId: string } };
        }) => {
          const key = `${where.userId_taskId.userId}:${where.userId_taskId.taskId}`;
          const current = userTasks.get(key);
          if (!current) return Promise.resolve(null);
          return Promise.resolve({
            ...current,
            task: { id: taskId, title: 'Watch sunrise' },
          });
        },
        upsert: ({
          where,
          create,
          update,
        }: {
          where: { userId_taskId: { userId: string; taskId: string } };
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }) => {
          const key = `${where.userId_taskId.userId}:${where.userId_taskId.taskId}`;
          const existing = userTasks.get(key);
          const next = existing
            ? { ...existing, ...update, updatedAt: new Date() }
            : {
                id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
                ...create,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
          userTasks.set(key, next);
          return Promise.resolve(next);
        },
        count: ({
          where,
        }: {
          where: { userId: string; completedAt?: { not: null } };
        }) =>
          Promise.resolve(
            [...userTasks.values()].filter((item) => {
              if (item.userId !== where.userId) return false;
              if (where.completedAt) return Boolean(item.completedAt);
              return true;
            }).length,
          ),
        findMany: () =>
          Promise.resolve(
            [...userTasks.values()]
              .filter((item) => item.userId === userId && item.completedAt)
              .map((item) => ({
                ...item,
                task: {
                  id: taskId,
                  title: 'Watch sunrise',
                  summary: 's',
                  coverImageUrl: null,
                  categoryId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
                  difficulty: 'EASY',
                  status: TaskStatus.PUBLISHED,
                  category: {
                    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
                    name: '自然与世界',
                    slug: 'nature-world',
                  },
                },
              })),
          ),
      },
      customWish: {
        create: ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({
            id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
            ...data,
            status: 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        count: () => Promise.resolve(0),
        findMany: () => Promise.resolve([]),
        findUnique: () => Promise.resolve(null),
        update: jest.fn(),
        delete: jest.fn(),
      },
      explorationRecord: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          const created = {
            id: '99999999-9999-4999-8999-999999999999',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
            completedAt: new Date(),
          };
          records.set(String(created.id), created);
          return Promise.resolve(created);
        },
        findUnique: ({ where }: { where: { id: string } }) =>
          Promise.resolve(records.get(where.id) ?? null),
        delete: ({ where }: { where: { id: string } }) => {
          const current = records.get(where.id);
          records.delete(where.id);
          return Promise.resolve(current);
        },
        count: () => Promise.resolve(records.size),
        findMany: () => Promise.resolve([...records.values()]),
        update: jest.fn(),
      },
      category: {
        findUnique: () =>
          Promise.resolve({ id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' }),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideGuard(AuthGuard)
      .useValue(authGuardMock)
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

  it('favorites and completes a task idempotently without requiring a record', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/me/tasks/${taskId}/favorite`)
      .expect(200);

    const first = await request(app.getHttpServer())
      .post(`/api/v1/me/tasks/${taskId}/complete`)
      .expect(201);
    const second = await request(app.getHttpServer())
      .post(`/api/v1/me/tasks/${taskId}/complete`)
      .expect(201);

    const firstBody = first.body as { data: { completedAt: string } };
    const secondBody = second.body as { data: { completedAt: string } };
    expect(firstBody.data.completedAt).toBeTruthy();
    expect(secondBody.data.completedAt).toBe(firstBody.data.completedAt);
  });

  it('creates a record for completed task and deleting it keeps completion', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/me/tasks/${taskId}/complete`)
      .expect(201);

    const created = await request(app.getHttpServer())
      .post('/api/v1/records')
      .send({ taskId, reflectionText: 'peaceful morning' })
      .expect(201);

    const createdBody = created.body as { data: { id: string } };
    await request(app.getHttpServer())
      .delete(`/api/v1/records/${createdBody.data.id}`)
      .expect(200);

    const key = `${userId}:${taskId}`;
    expect(userTasks.get(key)?.completedAt).toBeTruthy();
  });

  it('returns atlas stats from completed tasks', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/me/tasks/${taskId}/complete`)
      .expect(201);

    const atlas = await request(app.getHttpServer())
      .get('/api/v1/atlas/me')
      .expect(200);

    const atlasBody = atlas.body as {
      data: { stats: { litCount: number }; litTasks: unknown[] };
    };
    expect(atlasBody.data.stats.litCount).toBeGreaterThanOrEqual(1);
    expect(atlasBody.data.litTasks.length).toBeGreaterThanOrEqual(1);
  });
});
