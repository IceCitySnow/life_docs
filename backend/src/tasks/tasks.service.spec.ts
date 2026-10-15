import { NotFoundException } from '@nestjs/common';
import { TaskDifficulty, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  const count = jest.fn();
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const prisma = {
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    task: { count, findMany, findFirst },
  } as unknown as PrismaService;
  const service = new TasksService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists only published tasks with filters and pagination', async () => {
    count.mockResolvedValue(1);
    findMany.mockResolvedValue([{ id: 't1', title: 'Watch sunrise' }]);

    const result = await service.listPublished({
      page: 2,
      pageSize: 10,
      categoryId: '11111111-1111-1111-1111-111111111111',
      tag: 'nature',
      difficulty: TaskDifficulty.EASY,
    });

    expect(count).toHaveBeenCalledWith({
      where: {
        status: TaskStatus.PUBLISHED,
        categoryId: '11111111-1111-1111-1111-111111111111',
        difficulty: TaskDifficulty.EASY,
        tags: { has: 'nature' },
      },
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    );
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('hides draft/archived tasks behind not found', async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      service.getPublishedById('11111111-1111-1111-1111-111111111111'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
