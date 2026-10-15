import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ContentModerationStatus,
  Prisma,
  RecordVisibility,
  UserStatus,
} from '@prisma/client';
import {
  buildPagination,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';

const publicAuthorSelect = {
  id: true,
  displayName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class PublicRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationQueryDto, viewerId?: string) {
    const where: Prisma.ExplorationRecordWhereInput = {
      visibility: RecordVisibility.PUBLIC,
      moderationStatus: ContentModerationStatus.VISIBLE,
      user: { status: UserStatus.ACTIVE },
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.explorationRecord.count({ where }),
      this.prisma.explorationRecord.findMany({
        where,
        include: {
          user: { select: publicAuthorSelect },
          _count: { select: { likes: true, favorites: true } },
        },
        orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    const reactionMap = viewerId
      ? await this.loadViewerReactions(
          viewerId,
          items.map((item) => item.id),
        )
      : new Map<string, { liked: boolean; favorited: boolean }>();

    return {
      data: items.map((item) =>
        this.toPublicCard(item, reactionMap.get(item.id)),
      ),
      pagination: buildPagination(query.page, query.pageSize, total),
    };
  }

  async getById(recordId: string, viewerId?: string) {
    const record = await this.prisma.explorationRecord.findFirst({
      where: {
        id: recordId,
        visibility: RecordVisibility.PUBLIC,
        moderationStatus: ContentModerationStatus.VISIBLE,
        user: { status: UserStatus.ACTIVE },
      },
      include: {
        user: { select: publicAuthorSelect },
        _count: { select: { likes: true, favorites: true } },
      },
    });

    if (!record) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Record not found.',
      });
    }

    const reactionMap = viewerId
      ? await this.loadViewerReactions(viewerId, [record.id])
      : new Map<string, { liked: boolean; favorited: boolean }>();

    return {
      data: this.toPublicCard(record, reactionMap.get(record.id)),
    };
  }

  private async loadViewerReactions(viewerId: string, recordIds: string[]) {
    if (recordIds.length === 0) {
      return new Map<string, { liked: boolean; favorited: boolean }>();
    }

    const [likes, favorites] = await Promise.all([
      this.prisma.recordLike.findMany({
        where: { userId: viewerId, recordId: { in: recordIds } },
        select: { recordId: true },
      }),
      this.prisma.recordFavorite.findMany({
        where: { userId: viewerId, recordId: { in: recordIds } },
        select: { recordId: true },
      }),
    ]);

    const liked = new Set(likes.map((item) => item.recordId));
    const favorited = new Set(favorites.map((item) => item.recordId));
    const map = new Map<string, { liked: boolean; favorited: boolean }>();
    for (const id of recordIds) {
      map.set(id, {
        liked: liked.has(id),
        favorited: favorited.has(id),
      });
    }
    return map;
  }

  private toPublicCard(
    item: {
      id: string;
      userId: string;
      taskId: string | null;
      customWishId: string | null;
      titleSnapshot: string;
      reflectionText: string | null;
      photoRefs: string[];
      visibility: RecordVisibility;
      completedAt: Date;
      createdAt: Date;
      updatedAt: Date;
      user: {
        id: string;
        displayName: string | null;
        avatarUrl: string | null;
      };
      _count: { likes: number; favorites: number };
    },
    reaction?: { liked: boolean; favorited: boolean },
  ) {
    return {
      id: item.id,
      titleSnapshot: item.titleSnapshot,
      reflectionText: item.reflectionText,
      photoRefs: item.photoRefs,
      completedAt: item.completedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      taskId: item.taskId,
      author: item.user,
      likeCount: item._count.likes,
      favoriteCount: item._count.favorites,
      likedByMe: reaction?.liked ?? false,
      favoritedByMe: reaction?.favorited ?? false,
    };
  }
}
