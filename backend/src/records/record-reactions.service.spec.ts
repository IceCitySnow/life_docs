import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordReactionsService } from './record-reactions.service';

describe('RecordReactionsService', () => {
  const findFirst = jest.fn();
  const likeUpsert = jest.fn();
  const likeDeleteMany = jest.fn();
  const favoriteUpsert = jest.fn();

  const prisma = {
    explorationRecord: { findFirst },
    recordLike: { upsert: likeUpsert, deleteMany: likeDeleteMany },
    recordFavorite: { upsert: favoriteUpsert, deleteMany: jest.fn() },
  } as unknown as PrismaService;

  const service = new RecordReactionsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects likes on non-public records', async () => {
    findFirst.mockResolvedValue(null);
    await expect(service.setLike('u1', 'r1', true)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('like upsert is idempotent', async () => {
    findFirst.mockResolvedValue({ id: 'r1' });
    likeUpsert.mockResolvedValue({
      id: 'like-1',
      userId: 'u1',
      recordId: 'r1',
    });

    const first = await service.setLike('u1', 'r1', true);
    const second = await service.setLike('u1', 'r1', true);
    expect(first.data.liked).toBe(true);
    expect(second.data.liked).toBe(true);
    expect(likeUpsert).toHaveBeenCalledTimes(2);
  });

  it('unlike deletes without error when absent', async () => {
    findFirst.mockResolvedValue({ id: 'r1' });
    likeDeleteMany.mockResolvedValue({ count: 0 });
    const result = await service.setLike('u1', 'r1', false);
    expect(result.data.liked).toBe(false);
  });
});
