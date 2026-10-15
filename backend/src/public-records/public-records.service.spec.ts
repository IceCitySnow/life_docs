import { NotFoundException } from '@nestjs/common';
import {
  ContentModerationStatus,
  RecordVisibility,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PublicRecordsService } from './public-records.service';

describe('PublicRecordsService', () => {
  const count = jest.fn();
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const likeFindMany = jest.fn();
  const favoriteFindMany = jest.fn();

  const prisma = {
    explorationRecord: { count, findMany, findFirst },
    recordLike: { findMany: likeFindMany },
    recordFavorite: { findMany: favoriteFindMany },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService;

  const service = new PublicRecordsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    likeFindMany.mockResolvedValue([]);
    favoriteFindMany.mockResolvedValue([]);
  });

  it('lists only public visible records from active authors', async () => {
    count.mockResolvedValue(1);
    findMany.mockResolvedValue([
      {
        id: 'r1',
        userId: 'u1',
        taskId: null,
        customWishId: null,
        titleSnapshot: 'Hello',
        reflectionText: 'text',
        photoRefs: [],
        visibility: RecordVisibility.PUBLIC,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'u1', displayName: 'A', avatarUrl: null },
        _count: { likes: 2, favorites: 1 },
      },
    ]);

    const result = await service.list({ page: 1, pageSize: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].likeCount).toBe(2);
    expect(findMany).toHaveBeenCalled();
    const calls = findMany.mock.calls as Array<
      [
        {
          where: {
            visibility: RecordVisibility;
            moderationStatus: ContentModerationStatus;
            user: { status: UserStatus };
          };
        },
      ]
    >;
    const listArg = calls[0][0];
    expect(listArg.where.visibility).toBe(RecordVisibility.PUBLIC);
    expect(listArg.where.moderationStatus).toBe(
      ContentModerationStatus.VISIBLE,
    );
    expect(listArg.where.user.status).toBe(UserStatus.ACTIVE);
  });

  it('hides non-public records from detail lookup', async () => {
    findFirst.mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
