import { WishStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WishesService } from './wishes.service';

describe('WishesService', () => {
  const findUnique = jest.fn();
  const update = jest.fn();
  const prisma = {
    customWish: {
      findUnique,
      update,
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    category: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const service = new WishesService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('complete is idempotent', async () => {
    const completedAt = new Date('2026-02-01T00:00:00.000Z');
    findUnique.mockResolvedValue({
      id: 'w1',
      userId: 'u1',
      status: WishStatus.COMPLETED,
      completedAt,
    });

    const result = await service.complete('u1', 'w1');
    expect(update).not.toHaveBeenCalled();
    expect(result.data.completedAt).toEqual(completedAt);
  });
});
