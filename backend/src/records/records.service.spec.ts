import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordsService } from './records.service';

describe('RecordsService', () => {
  const userTaskFindUnique = jest.fn();
  const recordCreate = jest.fn();
  const recordFindUnique = jest.fn();
  const recordDelete = jest.fn();

  const prisma = {
    userTask: { findUnique: userTaskFindUnique },
    customWish: { findUnique: jest.fn() },
    explorationRecord: {
      create: recordCreate,
      findUnique: recordFindUnique,
      delete: recordDelete,
      count: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const service = new RecordsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires completed task when linking a task', async () => {
    userTaskFindUnique.mockResolvedValue({ completedAt: null });
    await expect(service.create('u1', { taskId: 't1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deleting a record does not touch user task completion', async () => {
    recordFindUnique.mockResolvedValue({
      id: 'r1',
      userId: 'u1',
    });
    recordDelete.mockResolvedValue({ id: 'r1' });

    await service.remove('u1', 'r1');
    expect(recordDelete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    expect(userTaskFindUnique).not.toHaveBeenCalled();
  });
});
