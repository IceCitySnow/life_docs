import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CategoriesService', () => {
  it('returns only active categories ordered by sortOrder', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([{ id: '1', name: '自然与世界', slug: 'nature' }]);
    const prisma = { category: { findMany } } as unknown as PrismaService;
    const service = new CategoriesService(prisma);

    await service.listActive();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'desc' }, { name: 'asc' }],
      }),
    );
  });
});
