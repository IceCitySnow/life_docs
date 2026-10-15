import {
  BadRequestException,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ContentModerationStatus,
  RecordVisibility,
  UserRole,
  UserStatus,
} from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { hashSessionToken } from '../src/auth/token.util';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { WechatService } from '../src/auth/wechat.service';

type AuthLoginBody = {
  data: {
    accessToken: string;
    user: { id: string; role: string };
  };
};

/**
 * Phase B security E2E with real AuthGuard (no override).
 * Covers object auth, session lifecycle, and delete-account edges.
 */
describe('Phase B authz and lifecycle (e2e)', () => {
  let app: INestApplication<App>;

  const ownerOpenId = 'phase-b-owner-openid';
  const otherOpenId = 'phase-b-other-openid';
  const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const otherId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const privateRecordId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

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

  const sessions = new Map<
    string,
    {
      id: string;
      userId: string;
      tokenHash: string;
      expiresAt: Date;
      revokedAt: Date | null;
      createdAt: Date;
    }
  >();

  const records = new Map<string, Record<string, unknown>>();

  let nextUserSuffix = 0;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.API_PREFIX = 'api/v1';
    process.env.DATABASE_URL =
      'postgresql://life_exploration:life_exploration_dev@localhost:5432/life_exploration?schema=public';
    process.env.LOG_LEVEL = 'error';
    process.env.ENABLE_DEV_AUTH = 'true';
    process.env.AUTH_TOKEN_TTL_SECONDS = '3600';
    process.env.WECHAT_APP_ID = 'wx-test';
    process.env.WECHAT_APP_SECRET = 'wx-secret';

    users.set(ownerOpenId, {
      id: ownerId,
      wxOpenId: ownerOpenId,
      displayName: 'Owner',
      avatarUrl: null,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    users.set(otherOpenId, {
      id: otherId,
      wxOpenId: otherOpenId,
      displayName: 'Other',
      avatarUrl: null,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    records.set(privateRecordId, {
      id: privateRecordId,
      userId: ownerId,
      taskId: null,
      customWishId: null,
      titleSnapshot: 'Secret diary',
      reflectionText: 'private body',
      photoRefs: [],
      visibility: RecordVisibility.PRIVATE,
      moderationStatus: ContentModerationStatus.VISIBLE,
      hiddenAt: null,
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: ownerId,
        displayName: 'Owner',
        avatarUrl: null,
        status: UserStatus.ACTIVE,
      },
    });

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
          nextUserSuffix += 1;
          const created = {
            id: `dddddddd-dddd-4ddd-8ddd-${String(nextUserSuffix).padStart(12, '0')}`,
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
        update: ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const current = [...users.values()].find(
            (user) => user.id === where.id,
          );
          if (!current) return Promise.reject(new Error('missing user'));
          const updated = {
            ...current,
            ...data,
            updatedAt: new Date(),
          };
          users.set(updated.wxOpenId, updated);
          return Promise.resolve(updated);
        },
        delete: ({ where }: { where: { id: string } }) => {
          const current = [...users.values()].find(
            (user) => user.id === where.id,
          );
          if (!current) return Promise.reject(new Error('missing user'));
          users.delete(current.wxOpenId);
          for (const [id, record] of records.entries()) {
            if (record.userId === where.id) {
              records.delete(id);
            }
          }
          return Promise.resolve(current);
        },
      },
      authSession: {
        create: ({
          data,
        }: {
          data: { userId: string; tokenHash: string; expiresAt: Date };
        }) => {
          const created = {
            id: `eeeeeeee-eeee-4eee-8eee-${String(sessions.size + 1).padStart(12, '0')}`,
            userId: data.userId,
            tokenHash: data.tokenHash,
            expiresAt: data.expiresAt,
            revokedAt: null as Date | null,
            createdAt: new Date(),
          };
          sessions.set(created.tokenHash, created);
          return Promise.resolve(created);
        },
        findUnique: ({ where }: { where: { tokenHash: string } }) => {
          const session = sessions.get(where.tokenHash);
          if (!session) return Promise.resolve(null);
          const user = [...users.values()].find(
            (item) => item.id === session.userId,
          );
          return Promise.resolve({ ...session, user });
        },
        updateMany: ({
          where,
          data,
        }: {
          where: { id?: string; userId?: string; revokedAt: null };
          data: { revokedAt: Date };
        }) => {
          let count = 0;
          for (const [hash, session] of sessions.entries()) {
            const matchId = where.id ? session.id === where.id : true;
            const matchUser = where.userId
              ? session.userId === where.userId
              : true;
            if (matchId && matchUser && session.revokedAt === null) {
              sessions.set(hash, { ...session, revokedAt: data.revokedAt });
              count += 1;
            }
          }
          return Promise.resolve({ count });
        },
      },
      explorationRecord: {
        findUnique: ({
          where,
          include,
        }: {
          where: { id: string };
          include?: { user?: unknown };
        }) => {
          const record = records.get(where.id);
          if (!record) return Promise.resolve(null);
          if (include?.user) {
            return Promise.resolve(record);
          }
          const { user: _user, ...rest } = record as {
            user?: unknown;
          } & Record<string, unknown>;
          void _user;
          return Promise.resolve(rest);
        },
        update: () => Promise.reject(new Error('unused')),
        delete: () => Promise.reject(new Error('unused')),
        count: () => Promise.resolve(0),
        findMany: () => Promise.resolve([]),
      },
      $transaction: async (fn: (tx: typeof prismaMock) => Promise<unknown>) =>
        fn(prismaMock),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(WechatService)
      .useValue({
        exchangeCode: () => Promise.resolve({ openId: ownerOpenId }),
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

  async function loginAs(wxOpenId: string): Promise<string> {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-login')
      .send({ wxOpenId })
      .expect(201);
    return (login.body as AuthLoginBody).data.accessToken;
  }

  it('hides another user private record behind 404 (ID guess)', async () => {
    const token = await loginAs(otherOpenId);
    await request(app.getHttpServer())
      .get(`/api/v1/records/${privateRecordId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/v1/records/${privateRecordId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ titleSnapshot: 'hacked' })
      .expect(403);
  });

  it('rejects expired bearer tokens', async () => {
    const token = await loginAs(ownerOpenId);
    const hash = hashSessionToken(token);
    const session = sessions.get(hash);
    expect(session).toBeTruthy();
    sessions.set(hash, {
      ...session!,
      expiresAt: new Date(Date.now() - 5_000),
    });

    await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('rejects DISABLED accounts on protected routes', async () => {
    const token = await loginAs(ownerOpenId);
    const owner = users.get(ownerOpenId)!;
    users.set(ownerOpenId, { ...owner, status: UserStatus.DISABLED });

    await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    users.set(ownerOpenId, { ...owner, status: UserStatus.ACTIVE });
  });

  it('refuses login for DELETING accounts (no reactivation)', async () => {
    const stuckOpenId = 'phase-b-deleting-openid';
    users.set(stuckOpenId, {
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      wxOpenId: stuckOpenId,
      displayName: 'Stuck',
      avatarUrl: null,
      role: UserRole.USER,
      status: UserStatus.DELETING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/dev-login')
      .send({ wxOpenId: stuckOpenId })
      .expect(403);
  });

  it('deletes account, revokes token, is idempotent, allows fresh openId signup', async () => {
    const disposableOpenId = 'phase-b-delete-openid';
    users.set(disposableOpenId, {
      id: '99999999-9999-4999-8999-999999999999',
      wxOpenId: disposableOpenId,
      displayName: 'Disposable',
      avatarUrl: null,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = await loginAs(disposableOpenId);

    await request(app.getHttpServer())
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(users.has(disposableOpenId)).toBe(false);
    expect(sessions.get(hashSessionToken(token))?.revokedAt).toBeTruthy();

    await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    // Second delete with stale token: auth fails (session revoked).
    await request(app.getHttpServer())
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    const again = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-login')
      .send({ wxOpenId: disposableOpenId, displayName: 'Born Again' })
      .expect(201);

    const body = again.body as AuthLoginBody;
    expect(body.data.user.id).not.toBe('99999999-9999-4999-8999-999999999999');
    expect(body.data.user.id).toEqual(expect.any(String));
  });
});
