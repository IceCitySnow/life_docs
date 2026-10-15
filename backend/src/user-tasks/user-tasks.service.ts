import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { buildPagination } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ListMyTasksQueryDto } from './dto/list-my-tasks-query.dto';

@Injectable()
export class UserTasksService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string, query: ListMyTasksQueryDto) {
    const where: Prisma.UserTaskWhereInput = {
      userId,
      ...(query.favorite !== undefined ? { isFavorite: query.favorite } : {}),
      ...(query.wished !== undefined ? { isWished: query.wished } : {}),
      ...(query.started === true ? { startedAt: { not: null } } : {}),
      ...(query.started === false ? { startedAt: null } : {}),
      ...(query.completed === true ? { completedAt: { not: null } } : {}),
      ...(query.completed === false ? { completedAt: null } : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.userTask.count({ where }),
      this.prisma.userTask.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              title: true,
              summary: true,
              status: true,
              difficulty: true,
              categoryId: true,
              coverImageUrl: true,
              tags: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: items,
      pagination: buildPagination(query.page, query.pageSize, total),
    };
  }

  async setFavorite(userId: string, taskId: string, isFavorite: boolean) {
    await this.ensurePublishedTask(taskId);
    const data = await this.upsertFlags(userId, taskId, { isFavorite });
    return { data };
  }

  async setWished(userId: string, taskId: string, isWished: boolean) {
    await this.ensurePublishedTask(taskId);
    const data = await this.upsertFlags(userId, taskId, { isWished });
    return { data };
  }

  async start(userId: string, taskId: string) {
    await this.ensurePublishedTask(taskId);
    const existing = await this.prisma.userTask.findUnique({
      where: { userId_taskId: { userId, taskId } },
    });

    if (existing?.startedAt) {
      return { data: existing };
    }

    const data = await this.prisma.userTask.upsert({
      where: { userId_taskId: { userId, taskId } },
      create: {
        userId,
        taskId,
        startedAt: new Date(),
      },
      update: {
        startedAt: existing?.startedAt ?? new Date(),
      },
    });
    return { data };
  }

  async complete(userId: string, taskId: string) {
    await this.ensurePublishedTask(taskId);
    const existing = await this.prisma.userTask.findUnique({
      where: { userId_taskId: { userId, taskId } },
    });

    if (existing?.completedAt) {
      return { data: existing };
    }

    const now = new Date();
    const data = await this.prisma.userTask.upsert({
      where: { userId_taskId: { userId, taskId } },
      create: {
        userId,
        taskId,
        startedAt: now,
        completedAt: now,
      },
      update: {
        startedAt: existing?.startedAt ?? now,
        completedAt: now,
      },
    });
    return { data };
  }

  private async ensurePublishedTask(taskId: string): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, status: TaskStatus.PUBLISHED },
      select: { id: true },
    });
    if (!task) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Task not found.',
      });
    }
  }

  private upsertFlags(
    userId: string,
    taskId: string,
    flags: { isFavorite?: boolean; isWished?: boolean },
  ) {
    return this.prisma.userTask.upsert({
      where: { userId_taskId: { userId, taskId } },
      create: {
        userId,
        taskId,
        isFavorite: flags.isFavorite ?? false,
        isWished: flags.isWished ?? false,
      },
      update: {
        ...(flags.isFavorite !== undefined
          ? { isFavorite: flags.isFavorite }
          : {}),
        ...(flags.isWished !== undefined ? { isWished: flags.isWished } : {}),
      },
    });
  }
}
