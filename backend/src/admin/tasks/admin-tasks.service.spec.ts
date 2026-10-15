import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TaskDifficulty, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminTasksService } from './admin-tasks.service';

describe('AdminTasksService', () => {
  const categoryFindUnique = jest.fn();
  const taskFindUnique = jest.fn();
  const taskCreate = jest.fn();
  const taskUpdate = jest.fn();
  const prisma = {
    category: { findUnique: categoryFindUnique },
    task: {
      findUnique: taskFindUnique,
      create: taskCreate,
      update: taskUpdate,
    },
  } as unknown as PrismaService;
  const service = new AdminTasksService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects create when category does not exist', async () => {
    categoryFindUnique.mockResolvedValue(null);

    await expect(
      service.create({
        categoryId: '11111111-1111-1111-1111-111111111111',
        title: 't',
        summary: 's',
        instructions: 'i',
        difficulty: TaskDifficulty.EASY,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates draft tasks by default', async () => {
    categoryFindUnique.mockResolvedValue({ id: 'c1' });
    taskCreate.mockResolvedValue({
      id: 't1',
      status: TaskStatus.DRAFT,
      title: 't',
    });

    const result = await service.create({
      categoryId: '11111111-1111-1111-1111-111111111111',
      title: 't',
      summary: 's',
      instructions: 'i',
      difficulty: TaskDifficulty.EASY,
    });

    expect(taskCreate).toHaveBeenCalledTimes(1);
    const createCalls = taskCreate.mock.calls as Array<
      [{ data: { status: TaskStatus } }]
    >;
    expect(createCalls[0]?.[0].data.status).toBe(TaskStatus.DRAFT);
    expect(result.data.id).toBe('t1');
  });

  it('publish is idempotent', async () => {
    taskFindUnique.mockResolvedValue({
      id: 't1',
      status: TaskStatus.PUBLISHED,
    });

    const result = await service.publish('t1');
    expect(taskUpdate).not.toHaveBeenCalled();
    expect(result.data.status).toBe(TaskStatus.PUBLISHED);
  });

  it('archive returns not found for missing task', async () => {
    taskFindUnique.mockResolvedValue(null);
    await expect(service.archive('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
