import { Injectable, NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { toPublicUser } from '../auth/public-user.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status === UserStatus.DELETING) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'User not found.',
      });
    }
    return { data: toPublicUser(user) };
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing || existing.status !== UserStatus.ACTIVE) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'User not found.',
      });
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined
          ? { displayName: dto.displayName }
          : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
      },
    });
    return { data: toPublicUser(user) };
  }

  /**
   * Account deletion:
   * 1) mark DELETING + revoke sessions
   * 2) hard-delete the user row (cascades personal data per Prisma schema)
   *
   * Cleared by cascade: sessions, userTasks, wishes, records (+likes/favorites),
   * reports filed by the user. Reports handled by the user keep rows with
   * handledByUserId set null.
   *
   * Photo object storage: first version only stores refs; no binary purge job yet.
   * Same WeChat openId can register again after deletion.
   */
  async deleteMe(userId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    // Idempotent: already gone (or concurrent delete finished) → success.
    if (!existing) {
      return {
        data: {
          success: true,
          note: 'Account already deleted.',
        },
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (existing.status !== UserStatus.DELETING) {
        await tx.user.update({
          where: { id: userId },
          data: { status: UserStatus.DELETING },
        });
      }
      await tx.user.delete({ where: { id: userId } });
    });

    return {
      data: {
        success: true,
        note: 'Account and associated personal data were deleted. Sessions were revoked.',
      },
    };
  }
}
