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
  ReportReason,
  ReportStatus,
  TaskStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Phase 6 light social (e2e)', () => {
  let app: INestApplication<App>;
  const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const otherUserId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const adminId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const publicRecordId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const privateRecordId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const taskId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

  let currentUser = {
    id: userId,
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    displayName: 'Explorer',
    avatarUrl: null as string | null,
    sessionId: '11111111-1111-4111-8111-111111111111',
  };

  const likes = new Map<
    string,
    { id: string; userId: string; recordId: string }
  >();
  const favorites = new Map<
    string,
    { id: string; userId: string; recordId: string }
  >();
  const reports = new Map<string, Record<string, unknown>>();

  const records: Record<string, Record<string, unknown>> = {
    [publicRecordId]: {
      id: publicRecordId,
      userId: otherUserId,
      taskId,
      customWishId: null,
      titleSnapshot: 'Public walk',
      reflectionText: 'Nice',
      photoRefs: [],
      visibility: RecordVisibility.PUBLIC,
      moderationStatus: ContentModerationStatus.VISIBLE,
      hiddenAt: null,
      completedAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      user: {
        id: otherUserId,
        displayName: 'Other',
        avatarUrl: null,
        status: UserStatus.ACTIVE,
      },
    },
    [privateRecordId]: {
      id: privateRecordId,
      userId: otherUserId,
      taskId,
      customWishId: null,
      titleSnapshot: 'Private note',
      reflectionText: 'Secret',
      photoRefs: [],
      visibility: RecordVisibility.PRIVATE,
      moderationStatus: ContentModerationStatus.VISIBLE,
      hiddenAt: null,
      completedAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      user: {
        id: otherUserId,
        displayName: 'Other',
        avatarUrl: null,
        status: UserStatus.ACTIVE,
      },
    },
  };

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
        const req = context.switchToHttp().getRequest<{ user?: unknown }>();
        req.user = currentUser;
        return true;
      },
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
      explorationRecord: {
        count: ({
          where,
        }: {
          where: {
            visibility?: RecordVisibility;
            moderationStatus?: ContentModerationStatus;
          };
        }) =>
          Promise.resolve(
            Object.values(records).filter(
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
          };
        }) =>
          Promise.resolve(
            Object.values(records)
              .filter(
                (item) =>
                  item.visibility === where.visibility &&
                  item.moderationStatus === where.moderationStatus,
              )
              .map((item) => ({
                ...item,
                _count: {
                  likes: [...likes.values()].filter(
                    (like) => like.recordId === item.id,
                  ).length,
                  favorites: [...favorites.values()].filter(
                    (fav) => fav.recordId === item.id,
                  ).length,
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
          const item = where.id ? records[where.id] : undefined;
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
            _count: {
              likes: [...likes.values()].filter(
                (like) => like.recordId === item.id,
              ).length,
              favorites: [...favorites.values()].filter(
                (fav) => fav.recordId === item.id,
              ).length,
            },
          });
        },
        findUnique: ({ where }: { where: { id: string } }) =>
          Promise.resolve(records[where.id] ?? null),
        update: ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const current = records[where.id];
          if (!current) return Promise.resolve(null);
          records[where.id] = { ...current, ...data };
          return Promise.resolve(records[where.id]);
        },
      },
      recordLike: {
        findMany: ({
          where,
        }: {
          where: { userId: string; recordId: { in: string[] } };
        }) =>
          Promise.resolve(
            [...likes.values()].filter(
              (item) =>
                item.userId === where.userId &&
                where.recordId.in.includes(item.recordId),
            ),
          ),
        upsert: ({
          where,
          create,
        }: {
          where: { userId_recordId: { userId: string; recordId: string } };
          create: { userId: string; recordId: string };
        }) => {
          const key = `${where.userId_recordId.userId}:${where.userId_recordId.recordId}`;
          const existing = likes.get(key);
          if (existing) return Promise.resolve(existing);
          const created = { id: `like-${likes.size + 1}`, ...create };
          likes.set(key, created);
          return Promise.resolve(created);
        },
        deleteMany: ({
          where,
        }: {
          where: { userId: string; recordId: string };
        }) => {
          likes.delete(`${where.userId}:${where.recordId}`);
          return Promise.resolve({ count: 1 });
        },
      },
      recordFavorite: {
        findMany: () => Promise.resolve([]),
        upsert: ({
          where,
          create,
        }: {
          where: { userId_recordId: { userId: string; recordId: string } };
          create: { userId: string; recordId: string };
        }) => {
          const key = `${where.userId_recordId.userId}:${where.userId_recordId.recordId}`;
          const existing = favorites.get(key);
          if (existing) return Promise.resolve(existing);
          const created = { id: `fav-${favorites.size + 1}`, ...create };
          favorites.set(key, created);
          return Promise.resolve(created);
        },
        deleteMany: ({
          where,
        }: {
          where: { userId: string; recordId: string };
        }) => {
          favorites.delete(`${where.userId}:${where.recordId}`);
          return Promise.resolve({ count: 1 });
        },
      },
      task: {
        findFirst: ({
          where,
        }: {
          where: { id: string; status?: TaskStatus };
        }) =>
          Promise.resolve(
            where.id === taskId && where.status === TaskStatus.PUBLISHED
              ? { id: taskId, title: 'Demo', status: TaskStatus.PUBLISHED }
              : null,
          ),
      },
      report: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          const id = `aaaaaaaa-bbbb-4ccc-8ddd-${String(reports.size + 1).padStart(12, '0')}`;
          const created = { id, ...data, status: ReportStatus.PENDING };
          reports.set(id, created);
          return Promise.resolve(created);
        },
        findUnique: ({ where }: { where: { id: string } }) =>
          Promise.resolve(reports.get(where.id) ?? null),
        count: () => Promise.resolve(reports.size),
        findMany: () => Promise.resolve([...reports.values()]),
        update: ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const current = reports.get(where.id);
          if (!current) return Promise.resolve(null);
          const updated = {
            ...current,
            ...data,
            record: records[String(current.recordId)] ?? null,
          };
          reports.set(where.id, updated);
          return Promise.resolve(updated);
        },
      },
      authenticateBearerToken: undefined,
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

  it('lists only public records', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/public/records')
      .expect(200);
    const body = res.body as { data: Array<{ id: string }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(publicRecordId);
    expect(
      body.data.find((item) => item.id === privateRecordId),
    ).toBeUndefined();
  });

  it('returns 404 for private record on public detail', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/public/records/${privateRecordId}`)
      .expect(404);
  });

  it('likes are idempotent', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/records/${publicRecordId}/like`)
      .expect(200);
    await request(app.getHttpServer())
      .put(`/api/v1/records/${publicRecordId}/like`)
      .expect(200);
    expect(likes.size).toBe(1);
  });

  it('cannot like a private record', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/records/${privateRecordId}/like`)
      .expect(404);
  });

  it('creates a report and lets admin hide content', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/reports')
      .send({
        recordId: publicRecordId,
        reason: ReportReason.SPAM,
        details: 'spam content',
      })
      .expect(201);

    const createdBody = created.body as { data: { id: string } };
    const reportId = createdBody.data.id;
    currentUser = {
      id: adminId,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      displayName: 'Admin',
      avatarUrl: null,
      sessionId: '22222222-2222-4222-8222-222222222222',
    };

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/reports/${reportId}`)
      .send({
        status: ReportStatus.RESOLVED,
        hideContent: true,
        resolutionNote: 'hidden',
      })
      .expect(200);

    expect(records[publicRecordId].moderationStatus).toBe(
      ContentModerationStatus.HIDDEN,
    );

    currentUser = {
      id: userId,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      displayName: 'Explorer',
      avatarUrl: null,
      sessionId: '11111111-1111-4111-8111-111111111111',
    };

    await request(app.getHttpServer())
      .get(`/api/v1/public/records/${publicRecordId}`)
      .expect(404);
  });

  it('rejects non-admin report handling', async () => {
    const lockedReportId = '99999999-9999-4999-8999-999999999999';
    reports.set(lockedReportId, {
      id: lockedReportId,
      recordId: privateRecordId,
      status: ReportStatus.PENDING,
    });
    currentUser = {
      id: userId,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      displayName: 'Explorer',
      avatarUrl: null,
      sessionId: '11111111-1111-4111-8111-111111111111',
    };

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/reports/${lockedReportId}`)
      .send({ status: ReportStatus.REJECTED })
      .expect(403);
  });
});
