import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ContentModerationStatus,
  RecordVisibility,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecordReactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async setLike(userId: string, recordId: string, liked: boolean) {
    await this.ensurePublicInteractable(recordId);

    if (liked) {
      const data = await this.prisma.recordLike.upsert({
        where: { userId_recordId: { userId, recordId } },
        create: { userId, recordId },
        update: {},
      });
      return { data: { recordId, liked: true, id: data.id } };
    }

    await this.prisma.recordLike.deleteMany({
      where: { userId, recordId },
    });
    return { data: { recordId, liked: false } };
  }

  async setFavorite(userId: string, recordId: string, favorited: boolean) {
    await this.ensurePublicInteractable(recordId);

    if (favorited) {
      const data = await this.prisma.recordFavorite.upsert({
        where: { userId_recordId: { userId, recordId } },
        create: { userId, recordId },
        update: {},
      });
      return { data: { recordId, favorited: true, id: data.id } };
    }

    await this.prisma.recordFavorite.deleteMany({
      where: { userId, recordId },
    });
    return { data: { recordId, favorited: false } };
  }

  private async ensurePublicInteractable(recordId: string): Promise<void> {
    const record = await this.prisma.explorationRecord.findFirst({
      where: {
        id: recordId,
        visibility: RecordVisibility.PUBLIC,
        moderationStatus: ContentModerationStatus.VISIBLE,
        user: { status: UserStatus.ACTIVE },
      },
      select: { id: true },
    });

    if (!record) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Record not found.',
      });
    }
  }
}
