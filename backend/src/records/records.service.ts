import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentModerationStatus,
  RecordVisibility,
  UserStatus,
} from '@prisma/client';
import { buildPagination } from '../common/dto/pagination-query.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';

@Injectable()
export class RecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateRecordDto) {
    if (dto.taskId && dto.customWishId) {
      throw new BadRequestException({
        code: 'INVALID_RECORD_LINK',
        message: 'A record cannot link to both a task and a custom wish.',
      });
    }

    let titleSnapshot = dto.titleSnapshot?.trim();

    if (dto.taskId) {
      const userTask = await this.prisma.userTask.findUnique({
        where: { userId_taskId: { userId, taskId: dto.taskId } },
        include: { task: { select: { id: true, title: true } } },
      });
      if (!userTask?.completedAt) {
        throw new BadRequestException({
          code: 'TASK_NOT_COMPLETED',
          message: 'Records can only link to tasks you have completed.',
        });
      }
      titleSnapshot = titleSnapshot || userTask.task.title;
    }

    if (dto.customWishId) {
      const wish = await this.prisma.customWish.findUnique({
        where: { id: dto.customWishId },
      });
      if (!wish || wish.userId !== userId) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Wish not found.',
        });
      }
      titleSnapshot = titleSnapshot || wish.title;
    }

    if (!titleSnapshot) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'titleSnapshot is required when no task or wish is linked.',
      });
    }

    const data = await this.prisma.explorationRecord.create({
      data: {
        userId,
        taskId: dto.taskId,
        customWishId: dto.customWishId,
        titleSnapshot,
        reflectionText: dto.reflectionText,
        photoRefs: dto.photoRefs ?? [],
        visibility: dto.visibility ?? RecordVisibility.PRIVATE,
      },
    });

    return { data };
  }

  async listMine(userId: string, query: PaginationQueryDto) {
    const where = { userId };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.explorationRecord.count({ where }),
      this.prisma.explorationRecord.findMany({
        where,
        orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: items,
      pagination: buildPagination(query.page, query.pageSize, total),
    };
  }

  async getById(viewerId: string | undefined, recordId: string) {
    const record = await this.prisma.explorationRecord.findUnique({
      where: { id: recordId },
      include: {
        user: { select: { id: true, status: true } },
      },
    });
    if (!record) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Record not found.',
      });
    }

    const isOwner = viewerId !== undefined && record.userId === viewerId;
    const isPublicVisible =
      record.visibility === RecordVisibility.PUBLIC &&
      record.moderationStatus === ContentModerationStatus.VISIBLE &&
      record.user.status === UserStatus.ACTIVE;

    if (!isOwner && !isPublicVisible) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Record not found.',
      });
    }

    const { user: _user, ...data } = record;
    void _user;
    return { data };
  }

  async update(userId: string, recordId: string, dto: UpdateRecordDto) {
    await this.ensureOwnedRecord(userId, recordId);
    const data = await this.prisma.explorationRecord.update({
      where: { id: recordId },
      data: {
        ...(dto.titleSnapshot !== undefined
          ? { titleSnapshot: dto.titleSnapshot }
          : {}),
        ...(dto.reflectionText !== undefined
          ? { reflectionText: dto.reflectionText }
          : {}),
        ...(dto.photoRefs !== undefined ? { photoRefs: dto.photoRefs } : {}),
        ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
      },
    });
    return { data };
  }

  async remove(userId: string, recordId: string) {
    await this.ensureOwnedRecord(userId, recordId);
    await this.prisma.explorationRecord.delete({ where: { id: recordId } });
    // Intentionally does not modify UserTask.completedAt.
    return { data: { success: true } };
  }

  private async ensureOwnedRecord(userId: string, recordId: string) {
    const record = await this.prisma.explorationRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Record not found.',
      });
    }
    if (record.userId !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have access to this record.',
      });
    }
    return record;
  }
}
