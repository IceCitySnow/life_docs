import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ContentModerationStatus,
  RecordVisibility,
  TaskDifficulty,
  TaskStatus,
  UserRole,
  UserStatus,
  WishStatus,
} from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Phase 7 P0 path: explore → favorite → complete → record → atlas →
 * publish visibility → public feed → like → delete account cleanup.
 */
describe('Phase 7 stability P0 path (e2e)', () => {
  let app: INestApplication<App>;
  const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const taskId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const categoryId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  const currentUser: {
    id: string;
    role: UserRole;
    status: UserStatus;
    displayName: string | null;
    avatarUrl: string | null;
    sessionId: string;
  } = {
    id: userId,
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    displayName: 'P0 Explorer',
    avatarUrl: null,
    sessionId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  };

  const userTasks = new Map<string, Record<string, unknown>>();
  const records = new Map<string, Record<string, unknown>>();
  const likes = new Map<string, { userId: string; recordId: string }>();
  let userDeleted = false;

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
        if (userDeleted) {
          return false;
        }
        const req = context.switchToHttp().getRequest<{ user?: unknown }>();
        req.user = currentUser;
        return true;
      },
    };

    const publishedTask = {
      id: taskId,
      categoryId,
      title: 'P0 sunrise',
      summary: 'Walk at dawn',
      instructions: 'Go outside',
      coverImageUrl: null,
      estimatedMinutes: 30,
      difficulty: TaskDifficulty.EASY,
      budgetNote: null,
      requirements: null,
      alternatives: null,
      reflectionPrompt: null,
      tags: ['p0'],
      status: TaskStatus.PUBLISHED,
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: { id: categoryId, name: 'Nature', slug: 'nature' },
    };

    const prismaMock = {
      onModuleInit: () => undefined,
      onModuleDestroy: () => undefined,
      $connect: () => undefined,
      $disconnect: () => undefined,
      isDatabaseHealthy: () => Promise.resolve(true),
      $transaction: async (
        arg: Promise<unknown>[] | ((tx: typeof prismaMock) => Promise<unknown>),
      ) => {
        if (typeof arg === 'function') {
          return arg(prismaMock);
        }
        return Promise.all(arg);
      },
      category: {
        findMany: () =>
          Promise.resolve([
            {
              id: categoryId,
              name: 'Nature',
              slug: 'nature',
              isActive: true,
              sortOrder: 1,
            },
          ]),
      },
      task: {
        count: () => Promise.resolve(1),
        findMany: () => Promise.resolve([publishedTask]),
        findFirst: ({
          where,
        }: {
          where: { id?: string; status?: TaskStatus };
        }) =>
          Promise.resolve(
            where.id === taskId &&
              (!where.status || where.status === TaskStatus.PUBLISHED)
              ? publishedTask
              : null,
          ),
        findUnique: () => Promise.resolve(publishedTask),
      },
      userTask: {
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
        findMany: ({
          where,
        }: {
          where: { userId: string; completedAt?: { not: null } };
        }) =>
          Promise.resolve(
            [...userTasks.values()]
              .filter((item) => {
                if (item.userId !== where.userId) return false;
                if (where.completedAt) return Boolean(item.completedAt);
                return true;
              })
              .map((item) => ({
                ...item,
                task: {
                  id: taskId,
                  title: publishedTask.title,
                  summary: publishedTask.summary,
                  coverImageUrl: null,
                  categoryId,
                  difficulty: TaskDifficulty.EASY,
                  status: TaskStatus.PUBLISHED,
                  category: publishedTask.category,
                },
              })),
          ),
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
            task: { id: taskId, title: publishedTask.title },
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
          const existing = userTasks.get(key) ?? {
            id: `ut-${userTasks.size + 1}`,
            userId: where.userId_taskId.userId,
            taskId: where.userId_taskId.taskId,
            isFavorite: false,
            isWished: false,
            startedAt: null,
            completedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const next = { ...existing, ...create, ...update };
          userTasks.set(key, next);
          return Promise.resolve(next);
        },
      },
      explorationRecord: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          const id = `aaaaaaaa-bbbb-4ccc-8ddd-${String(records.size + 1).padStart(12, '0')}`;
          const created = {
            id,
            ...data,
            photoRefs: data.photoRefs ?? [],
            visibility: data.visibility ?? RecordVisibility.PRIVATE,
            moderationStatus: ContentModerationStatus.VISIBLE,
            hiddenAt: null,
            completedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            customWishId: data.customWishId ?? null,
          };
          records.set(id, created);
          return Promise.resolve(created);
        },
        count: ({
          where,
        }: {
          where: {
            visibility?: RecordVisibility;
            moderationStatus?: ContentModerationStatus;
          };
        }) =>
          Promise.resolve(
            [...records.values()].filter(
              (item) =>
                item.visibility === where.visibility &&
                item.moderationStatus === where.moderationStatus,
            ).length,
          ),
        findMany: ({
          where,
        }: {
          where: {
            visibility?: RecordVisibility;
            moderationStatus?: ContentModerationStatus;
            userId?: string;
          };
        }) =>
          Promise.resolve(
            [...records.values()]
              .filter((item) => {
                if (where.userId && item.userId !== where.userId) return false;
                if (where.visibility && item.visibility !== where.visibility) {
                  return false;
                }
                if (
                  where.moderationStatus &&
                  item.moderationStatus !== where.moderationStatus
                ) {
                  return false;
                }
                return true;
              })
              .map((item) => ({
                ...item,
                user: {
                  id: userId,
                  displayName: 'P0 Explorer',
                  avatarUrl: null,
                  status: UserStatus.ACTIVE,
                },
                _count: {
                  likes: [...likes.values()].filter(
                    (like) => like.recordId === item.id,
                  ).length,
                  favorites: 0,
                },
              })),
          ),
        findFirst: ({
          where,
        }: {
          where: {
            id?: string;
            visibility?: RecordVisibility;
            moderationStatus?: ContentModerationStatus;
          };
        }) => {
          const item = where.id ? records.get(where.id) : undefined;
          if (!item) return Promise.resolve(null);
          if (where.visibility && item.visibility !== where.visibility) {
            return Promise.resolve(null);
          }
          if (
            where.moderationStatus &&
            item.moderationStatus !== where.moderationStatus
          ) {
            return Promise.resolve(null);
          }
          return Promise.resolve({
            ...item,
            user: {
              id: userId,
              displayName: 'P0 Explorer',
              avatarUrl: null,
              status: UserStatus.ACTIVE,
            },
            _count: { likes: 0, favorites: 0 },
          });
        },
        findUnique: ({ where }: { where: { id: string } }) => {
          const item = records.get(where.id);
          if (!item) return Promise.resolve(null);
          return Promise.resolve({
            ...item,
            user: { id: userId, status: UserStatus.ACTIVE },
          });
        },
        update: ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const current = records.get(where.id);
          if (!current) return Promise.resolve(null);
          const next = { ...current, ...data };
          records.set(where.id, next);
          return Promise.resolve(next);
        },
        delete: ({ where }: { where: { id: string } }) => {
          const current = records.get(where.id);
          records.delete(where.id);
          return Promise.resolve(current);
        },
      },
      recordLike: {
        findMany: () => Promise.resolve([]),
        upsert: ({
          where,
          create,
        }: {
          where: { userId_recordId: { userId: string; recordId: string } };
          create: { userId: string; recordId: string };
        }) => {
          const key = `${where.userId_recordId.userId}:${where.userId_recordId.recordId}`;
          likes.set(key, create);
          return Promise.resolve({ id: `like-${likes.size}`, ...create });
        },
        deleteMany: () => Promise.resolve({ count: 1 }),
      },
      recordFavorite: {
        findMany: () => Promise.resolve([]),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      customWish: {
        findUnique: () => Promise.resolve(null),
        create: () =>
          Promise.resolve({
            id: 'wish-1',
            status: WishStatus.PENDING,
          }),
        findMany: () => Promise.resolve([]),
        count: () => Promise.resolve(0),
      },
      user: {
        findUnique: ({ where }: { where: { id: string } }) => {
          if (userDeleted || where.id !== userId) {
            return Promise.resolve(null);
          }
          return Promise.resolve({
            id: userId,
            displayName: currentUser.displayName,
            avatarUrl: null,
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
            createdAt: new Date(),
            updatedAt: new Date(),
            wxOpenId: 'p0-openid',
          });
        },
        update: ({ data }: { data: { status?: UserStatus } }) =>
          Promise.resolve({
            id: userId,
            status: data.status ?? UserStatus.ACTIVE,
          }),
        delete: () => {
          userDeleted = true;
          userTasks.clear();
          records.clear();
          likes.clear();
          return Promise.resolve({ id: userId });
        },
      },
      authSession: {
        updateMany: () => Promise.resolve({ count: 1 }),
      },
      report: {
        create: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
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
        transformOptions: { enableImplicitConversion: true },
        exceptionFactory: (errors: ValidationError[]) =>
          new BadRequestException({
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters.',
            details: errors,
          }),
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('completes the personal exploration + public social P0 path', async () => {
    const tasks = await request(app.getHttpServer())
      .get('/api/v1/tasks?page=1&pageSize=10')
      .expect(200);
    const tasksBody = tasks.body as { data: Array<{ id: string }> };
    expect(tasksBody.data[0].id).toBe(taskId);

    await request(app.getHttpServer())
      .put(`/api/v1/me/tasks/${taskId}/favorite`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/me/tasks/${taskId}/complete`)
      .expect(201);

    const created = await request(app.getHttpServer())
      .post('/api/v1/records')
      .send({
        taskId,
        reflectionText: 'p0 reflection',
        visibility: RecordVisibility.PRIVATE,
      })
      .expect(201);
    const createdBody = created.body as { data: { id: string } };
    const recordId = createdBody.data.id;

    const atlas = await request(app.getHttpServer())
      .get('/api/v1/atlas/me')
      .expect(200);
    const atlasBody = atlas.body as {
      data: { stats: { litCount: number } };
    };
    expect(atlasBody.data.stats.litCount).toBeGreaterThanOrEqual(1);

    // Private record must not appear publicly.
    const publicBefore = await request(app.getHttpServer())
      .get('/api/v1/public/records')
      .expect(200);
    const publicBeforeBody = publicBefore.body as { data: unknown[] };
    expect(publicBeforeBody.data).toHaveLength(0);

    await request(app.getHttpServer())
      .patch(`/api/v1/records/${recordId}`)
      .send({ visibility: RecordVisibility.PUBLIC })
      .expect(200);

    const publicAfter = await request(app.getHttpServer())
      .get('/api/v1/public/records')
      .expect(200);
    const publicAfterBody = publicAfter.body as {
      data: Array<{ id: string }>;
    };
    expect(publicAfterBody.data.some((item) => item.id === recordId)).toBe(
      true,
    );

    await request(app.getHttpServer())
      .put(`/api/v1/records/${recordId}/like`)
      .expect(200);
    expect(likes.size).toBe(1);
  });

  it('purges account data on DELETE /users/me', async () => {
    const deleted = await request(app.getHttpServer())
      .delete('/api/v1/users/me')
      .expect(200);
    const deletedBody = deleted.body as { data: { success: boolean } };
    expect(deletedBody.data.success).toBe(true);
    expect(userDeleted).toBe(true);
    expect(userTasks.size).toBe(0);
    expect(records.size).toBe(0);
  });
});
