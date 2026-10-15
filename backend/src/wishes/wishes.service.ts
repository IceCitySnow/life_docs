import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WishStatus } from '@prisma/client';
import { buildPagination } from '../common/dto/pagination-query.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateWishDto } from './dto/update-wish.dto';

@Injectable()
export class WishesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWishDto) {
    if (dto.categoryId) {
      await this.ensureCategory(dto.categoryId);
    }

    const data = await this.prisma.customWish.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        categoryId: dto.categoryId,
      },
    });
    return { data };
  }

  async listMine(userId: string, query: PaginationQueryDto) {
    const where = { userId };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.customWish.count({ where }),
      this.prisma.customWish.findMany({
        where,
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

  async update(userId: string, wishId: string, dto: UpdateWishDto) {
    await this.ensureOwnedWish(userId, wishId);
    if (dto.categoryId) {
      await this.ensureCategory(dto.categoryId);
    }

    const data = await this.prisma.customWish.update({
      where: { id: wishId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.status !== undefined
          ? {
              status: dto.status,
              completedAt:
                dto.status === WishStatus.COMPLETED ? new Date() : null,
            }
          : {}),
      },
    });
    return { data };
  }

  async remove(userId: string, wishId: string) {
    await this.ensureOwnedWish(userId, wishId);
    await this.prisma.customWish.delete({ where: { id: wishId } });
    return { data: { success: true } };
  }

  async complete(userId: string, wishId: string) {
    const existing = await this.ensureOwnedWish(userId, wishId);
    if (existing.status === WishStatus.COMPLETED && existing.completedAt) {
      return { data: existing };
    }

    const data = await this.prisma.customWish.update({
      where: { id: wishId },
      data: {
        status: WishStatus.COMPLETED,
        completedAt: existing.completedAt ?? new Date(),
      },
    });
    return { data };
  }

  private async ensureOwnedWish(userId: string, wishId: string) {
    const wish = await this.prisma.customWish.findUnique({
      where: { id: wishId },
    });
    if (!wish) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Wish not found.',
      });
    }
    if (wish.userId !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have access to this wish.',
      });
    }
    return wish;
  }

  private async ensureCategory(categoryId: string) {
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
}
