import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { buildPagination } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';

const publicTaskSelect = {
  id: true,
  categoryId: true,
  title: true,
  summary: true,
  instructions: true,
  coverImageUrl: true,
  estimatedMinutes: true,
  difficulty: true,
  budgetNote: true,
  requirements: true,
  alternatives: true,
  reflectionPrompt: true,
  tags: true,
  status: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.TaskSelect;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(query: ListTasksQueryDto) {
    const where: Prisma.TaskWhereInput = {
      status: TaskStatus.PUBLISHED,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(query.tag ? { tags: { has: query.tag } } : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        select: publicTaskSelect,
        orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: items,
      pagination: buildPagination(query.page, query.pageSize, total),
    };
  }

  async getPublishedById(taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        status: TaskStatus.PUBLISHED,
      },
      select: publicTaskSelect,
    });

    if (!task) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Task not found.',
      });
    }

    return { data: task };
  }

  async listRecommended(page = 1, pageSize = 20) {
    return this.listPublished({ page, pageSize });
  }
}
