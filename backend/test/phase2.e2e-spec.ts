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
import { hashSessionToken } from '../src/auth/token.util';
import { PrismaService } from '../src/prisma/prisma.service';
import { WechatService } from '../src/auth/wechat.service';

type AuthLoginBody = {
  data: {
    accessToken: string;
    user: {
      id: string;
      role: string;
      displayName: string | null;
    };
  };
};

describe('Phase 2 auth and users (e2e)', () => {
  let app: INestApplication<App>;

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

    users.set('seed-admin-openid', {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      wxOpenId: 'seed-admin-openid',
      displayName: 'Seed Admin',
      avatarUrl: null,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
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
          const created = {
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            wxOpenId: data.wxOpenId,
            displayName: data.displayName ?? null,
            avatarUrl: null,
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
      },
      authSession: {
        create: ({
          data,
        }: {
          data: { userId: string; tokenHash: string; expiresAt: Date };
        }) => {
          const created = {
            id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            userId: data.userId,
            tokenHash: data.tokenHash,
            expiresAt: data.expiresAt,
            revokedAt: null,
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
        exchangeCode: () => Promise.resolve({ openId: 'wx-user-openid' }),
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

  it('supports wechat login and returns public user only', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat')
      .send({ code: 'wx-code' })
      .expect(201);

    const body = response.body as AuthLoginBody;
    expect(body.data.accessToken).toEqual(expect.any(String));
    expect(body.data.user.role).toBe('USER');
    expect(body.data.user).not.toHaveProperty('wxOpenId');
    expect(JSON.stringify(body)).not.toContain('session_key');
    expect(JSON.stringify(body)).not.toContain('wx-secret');
  });

  it('supports dev login for seeded admin and protects /auth/me', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-login')
      .send({ wxOpenId: 'seed-admin-openid' })
      .expect(201);

    const body = login.body as AuthLoginBody;
    expect(body.data.user.role).toBe('ADMIN');

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${body.data.accessToken}`)
      .expect(200);

    expect((me.body as AuthLoginBody).data).toMatchObject({
      id: body.data.user.id,
      role: 'ADMIN',
    });
  });

  it('updates profile without accepting role/openid fields', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-login')
      .send({ wxOpenId: 'seed-admin-openid' })
      .expect(201);
    const token = (login.body as AuthLoginBody).data.accessToken;

    await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        displayName: 'New Name',
        role: 'ADMIN',
        wxOpenId: 'hacked',
      })
      .expect(400);

    const updated = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'New Name' })
      .expect(200);

    expect(updated.body).toMatchObject({
      data: { displayName: 'New Name', role: 'ADMIN' },
    });
  });

  it('revokes session on logout', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-login')
      .send({ wxOpenId: 'seed-admin-openid' })
      .expect(201);
    const token = (login.body as AuthLoginBody).data.accessToken;

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const session = sessions.get(hashSessionToken(token));
    expect(session?.revokedAt).toBeTruthy();

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});
