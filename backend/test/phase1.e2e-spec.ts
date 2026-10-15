import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  TaskDifficulty,
  TaskStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import { PrismaService } from '../src/prisma/prisma.service';

type TaskRow = {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  instructions: string;
  difficulty: TaskDifficulty;
  tags: string[];
  status: TaskStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type ListBody = {
  data: Array<{ id: string; slug?: string; status?: string }>;
  pagination?: { total: number };
};

type CreatedBody = {
  data: { status: string };
};

describe('Phase 1 categories and tasks (e2e)', () => {
  let app: INestApplication<App>;
  let actorRole: UserRole | null = UserRole.ADMIN;
  const categoryId = '11111111-1111-4111-8111-111111111111';
  const publishedId = '22222222-2222-4222-8222-222222222222';
  const draftId = '33333333-3333-4333-8333-333333333333';
  const tasks = new Map<string, TaskRow>();

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

    tasks.set(publishedId, {
      id: publishedId,
      categoryId,
      title: 'Published task',
      summary: 'summary',
      instructions: 'instructions',
      difficulty: TaskDifficulty.EASY,
      tags: ['nature'],
      status: TaskStatus.PUBLISHED,
      sortOrder: 10,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    tasks.set(draftId, {
      id: draftId,
      categoryId,
      title: 'Draft task',
      summary: 'summary',
      instructions: 'instructions',
      difficulty: TaskDifficulty.EASY,
      tags: ['draft'],
      status: TaskStatus.DRAFT,
      sortOrder: 1,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const authGuardMock: CanActivate = {
      canActivate(context: ExecutionContext) {
        if (!actorRole) {
          throw new UnauthorizedException({
            code: 'UNAUTHORIZED',
            message: 'Authentication required.',
          });
        }
        const request = context.switchToHttp().getRequest<{
          user?: unknown;
        }>();
        request.user = {
          id: '11111111-1111-4111-8111-999999999999',
          role: actorRole,
          status: UserStatus.ACTIVE,
          displayName: 'Tester',
          avatarUrl: null,
          sessionId: '22222222-2222-4222-8222-999999999999',
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
      category: {
        findMany: () =>
          Promise.resolve([
            {
              id: categoryId,
              name: '自然与世界',
              slug: 'nature-world',
              description: 'desc',
              coverImageUrl: null,
              sortOrder: 60,
            },
          ]),
        findUnique: ({ where }: { where: { id: string } }) =>
          Promise.resolve(where.id === categoryId ? { id: categoryId } : null),
      },
      task: {
        count: ({ where }: { where: { status?: TaskStatus } }) =>
          Promise.resolve(
            [...tasks.values()].filter((task) =>
              where.status ? task.status === where.status : true,
            ).length,
          ),
        findMany: ({
          where,
        }: {
          where: {
            status?: TaskStatus;
            categoryId?: string;
            difficulty?: TaskDifficulty;
            tags?: { has: string };
          };
        }) =>
          Promise.resolve(
            [...tasks.values()].filter((task) => {
              if (where.status && task.status !== where.status) return false;
              if (where.categoryId && task.categoryId !== where.categoryId)
                return false;
              if (where.difficulty && task.difficulty !== where.difficulty)
                return false;
              if (where.tags?.has && !task.tags.includes(where.tags.has))
                return false;
              return true;
            }),
          ),
        findFirst: ({
          where,
        }: {
          where: { id: string; status?: TaskStatus };
        }) => {
          const task = tasks.get(where.id);
          if (!task) return Promise.resolve(null);
          if (where.status && task.status !== where.status) {
            return Promise.resolve(null);
          }
          return Promise.resolve({
            ...task,
            category: {
              id: categoryId,
              name: '自然与世界',
              slug: 'nature-world',
            },
          });
        },
        findUnique: ({ where }: { where: { id: string } }) =>
          Promise.resolve(tasks.get(where.id) ?? null),
        create: ({
          data,
        }: {
          data: Omit<TaskRow, 'id' | 'createdAt' | 'updatedAt'>;
        }) => {
          const id = '44444444-4444-4444-8444-444444444444';
          const created: TaskRow = {
            id,
            ...data,
            tags: data.tags ?? [],
            status: data.status ?? TaskStatus.DRAFT,
            sortOrder: data.sortOrder ?? 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          tasks.set(id, created);
          return Promise.resolve(created);
        },
        update: ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<TaskRow>;
        }) => {
          const current = tasks.get(where.id);
          if (!current) return Promise.reject(new Error('missing'));
          const updated = { ...current, ...data, updatedAt: new Date() };
          tasks.set(where.id, updated);
          return Promise.resolve(updated);
        },
      },
      user: {
        findUnique: () => Promise.resolve(null),
        create: () => Promise.resolve(null),
        update: () => Promise.resolve(null),
      },
      authSession: {
        create: () => Promise.resolve({ id: 's1' }),
        findUnique: () => Promise.resolve(null),
        updateMany: () => Promise.resolve({ count: 0 }),
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

  beforeEach(() => {
    actorRole = UserRole.ADMIN;
  });

  it('GET /categories returns active categories', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .expect(200);
    const body = response.body as ListBody;
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.slug).toBe('nature-world');
  });

  it('GET /tasks returns only published tasks', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/tasks')
      .expect(200);
    const body = response.body as ListBody;
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe(publishedId);
    expect(body.pagination?.total).toBe(1);
  });

  it('GET /tasks/:id hides draft tasks', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/tasks/${draftId}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/tasks/${publishedId}`)
      .expect(200);
  });

  it('rejects admin create when unauthenticated', async () => {
    actorRole = null;
    await request(app.getHttpServer()).post('/api/v1/admin/tasks').expect(401);
  });

  it('rejects admin create for non-admin users', async () => {
    actorRole = UserRole.USER;
    await request(app.getHttpServer())
      .post('/api/v1/admin/tasks')
      .send({
        categoryId,
        title: 'x',
        summary: 'y',
        instructions: 'z',
        difficulty: 'EASY',
      })
      .expect(403);
  });

  it('allows admin create with admin identity and validates body', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/tasks')
      .send({ title: 'missing-fields' })
      .expect(400);

    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/tasks')
      .send({
        categoryId,
        title: 'Admin created',
        summary: 'summary',
        instructions: 'do it',
        difficulty: 'MEDIUM',
        tags: ['admin'],
      })
      .expect(201);

    const body = created.body as CreatedBody;
    expect(body.data.status).toBe('DRAFT');
  });
});
