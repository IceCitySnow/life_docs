import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AtlasService } from './atlas.service';

describe('AtlasService', () => {
  it('builds stats from completed user tasks only', async () => {
    const taskCount = jest.fn().mockResolvedValue(10);
    const prisma = {
      userTask: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          {
            taskId: 't1',
            completedAt: new Date('2026-01-01T00:00:00.000Z'),
            task: {
              id: 't1',
              title: 'A',
              category: { id: 'c1', name: '自然', slug: 'nature' },
            },
          },
          {
            taskId: 't2',
            completedAt: new Date('2026-01-02T00:00:00.000Z'),
            task: {
              id: 't2',
              title: 'B',
              category: { id: 'c1', name: '自然', slug: 'nature' },
            },
          },
        ]),
      },
      task: {
        count: taskCount,
      },
    } as unknown as PrismaService;

    const service = new AtlasService(prisma);
    const result = await service.getMine('u1');

    expect(result.data.stats).toEqual({
      litCount: 2,
      publishedTaskCount: 10,
      progressRatio: 0.2,
    });
    expect(result.data.categories[0]?.litCount).toBe(2);
    expect(taskCount).toHaveBeenCalledWith({
      where: { status: TaskStatus.PUBLISHED },
    });
  });
});
