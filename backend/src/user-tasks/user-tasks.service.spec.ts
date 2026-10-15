import { NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserTasksService } from './user-tasks.service';

describe('UserTasksService', () => {
  const taskFindFirst = jest.fn();
  const userTaskFindUnique = jest.fn();
  const userTaskUpsert = jest.fn();
  const prisma = {
    task: { findFirst: taskFindFirst },
    userTask: {
      findUnique: userTaskFindUnique,
      upsert: userTaskUpsert,
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const service = new UserTasksService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('favorite is idempotent via upsert', async () => {
    taskFindFirst.mockResolvedValue({ id: 't1', status: TaskStatus.PUBLISHED });
    userTaskUpsert.mockResolvedValue({
      id: 'ut1',
      isFavorite: true,
      taskId: 't1',
    });

    const first = await service.setFavorite('u1', 't1', true);
    const second = await service.setFavorite('u1', 't1', true);

    expect(userTaskUpsert).toHaveBeenCalledTimes(2);
    expect(first.data.isFavorite).toBe(true);
    expect(second.data.isFavorite).toBe(true);
  });

  it('complete does not require a record and keeps first completion time', async () => {
    taskFindFirst.mockResolvedValue({ id: 't1', status: TaskStatus.PUBLISHED });
    const completedAt = new Date('2026-01-01T00:00:00.000Z');
    userTaskFindUnique.mockResolvedValue({
      id: 'ut1',
      startedAt: completedAt,
      completedAt,
    });

    const result = await service.complete('u1', 't1');
    expect(userTaskUpsert).not.toHaveBeenCalled();
    expect(result.data.completedAt).toEqual(completedAt);
  });

  it('returns not found for unpublished tasks', async () => {
    taskFindFirst.mockResolvedValue(null);
    await expect(service.start('u1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
