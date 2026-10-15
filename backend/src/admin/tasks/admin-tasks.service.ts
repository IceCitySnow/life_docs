import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class AdminTasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTaskDto) {
    await this.ensureCategoryExists(dto.categoryId);

    const task = await this.prisma.task.create({
      data: {
        categoryId: dto.categoryId,
        title: dto.title,
        summary: dto.summary,
        instructions: dto.instructions,
        coverImageUrl: dto.coverImageUrl,
        estimatedMinutes: dto.estimatedMinutes,
        difficulty: dto.difficulty,
        budgetNote: dto.budgetNote,
        requirements: dto.requirements,
        alternatives: dto.alternatives,
        reflectionPrompt: dto.reflectionPrompt,
        tags: dto.tags ?? [],
        status: dto.status ?? TaskStatus.DRAFT,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return { data: task };
  }

  async update(taskId: string, dto: UpdateTaskDto) {
    await this.ensureTaskExists(taskId);
    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
        ...(dto.instructions !== undefined
          ? { instructions: dto.instructions }
          : {}),
        ...(dto.coverImageUrl !== undefined
          ? { coverImageUrl: dto.coverImageUrl }
          : {}),
        ...(dto.estimatedMinutes !== undefined
          ? { estimatedMinutes: dto.estimatedMinutes }
          : {}),
        ...(dto.difficulty !== undefined ? { difficulty: dto.difficulty } : {}),
        ...(dto.budgetNote !== undefined ? { budgetNote: dto.budgetNote } : {}),
        ...(dto.requirements !== undefined
          ? { requirements: dto.requirements }
          : {}),
        ...(dto.alternatives !== undefined
          ? { alternatives: dto.alternatives }
          : {}),
        ...(dto.reflectionPrompt !== undefined
          ? { reflectionPrompt: dto.reflectionPrompt }
          : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });

    return { data: task };
  }

  async publish(taskId: string) {
    const existing = await this.ensureTaskExists(taskId);
    if (existing.status === TaskStatus.PUBLISHED) {
      return { data: existing };
    }

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.PUBLISHED },
    });
    return { data: task };
  }

  async archive(taskId: string) {
    const existing = await this.ensureTaskExists(taskId);
    if (existing.status === TaskStatus.ARCHIVED) {
      return { data: existing };
    }

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.ARCHIVED },
    });
    return { data: task };
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException({
        code: 'INVALID_CATEGORY',
        message: 'categoryId does not reference an existing category.',
      });
    }
  }

  private async ensureTaskExists(taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Task not found.',
      });
    }
    return task;
  }
}
