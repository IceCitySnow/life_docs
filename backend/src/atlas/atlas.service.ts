import { Injectable } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AtlasService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(userId: string) {
    const [completedTotal, publishedTotal, litTasks] = await Promise.all([
      this.prisma.userTask.count({
        where: { userId, completedAt: { not: null } },
      }),
      this.prisma.task.count({
        where: { status: TaskStatus.PUBLISHED },
      }),
      this.prisma.userTask.findMany({
        where: { userId, completedAt: { not: null } },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              summary: true,
              coverImageUrl: true,
              categoryId: true,
              difficulty: true,
              status: true,
              category: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
        orderBy: [{ completedAt: 'desc' }],
      }),
    ]);

    const categoryMap = new Map<
      string,
      { categoryId: string; name: string; slug: string; litCount: number }
    >();
    for (const item of litTasks) {
      const category = item.task.category;
      const current = categoryMap.get(category.id) ?? {
        categoryId: category.id,
        name: category.name,
        slug: category.slug,
        litCount: 0,
      };
      current.litCount += 1;
      categoryMap.set(category.id, current);
    }

    return {
      data: {
        stats: {
          litCount: completedTotal,
          publishedTaskCount: publishedTotal,
          progressRatio:
            publishedTotal === 0 ? 0 : completedTotal / publishedTotal,
        },
        categories: [...categoryMap.values()],
        litTasks: litTasks.map((item) => ({
          taskId: item.taskId,
          completedAt: item.completedAt,
          task: item.task,
        })),
      },
    };
  }
}
