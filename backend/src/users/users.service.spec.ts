import { NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const userFindUnique = jest.fn();
  const userUpdate = jest.fn();
  const userDelete = jest.fn();
  const authSessionUpdateMany = jest.fn();

  const prisma = {
    user: {
      findUnique: userFindUnique,
      update: userUpdate,
      delete: userDelete,
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        authSession: { updateMany: authSessionUpdateMany },
        user: {
          update: userUpdate,
          delete: userDelete,
        },
      }),
    ),
  } as unknown as PrismaService;

  const service = new UsersService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    userFindUnique.mockResolvedValue({
      id: 'u1',
      displayName: 'A',
      avatarUrl: null,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      wxOpenId: 'secret-openid',
    });
    userUpdate.mockResolvedValue({
      id: 'u1',
      status: UserStatus.DELETING,
    });
    userDelete.mockResolvedValue({ id: 'u1' });
    authSessionUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('never returns wxOpenId in profile payloads', async () => {
    const result = await service.getMe('u1');
    expect(result.data).not.toHaveProperty('wxOpenId');
    expect(result.data.id).toBe('u1');
  });

  it('hides deleting accounts from getMe', async () => {
    userFindUnique.mockResolvedValue({
      id: 'u1',
      status: UserStatus.DELETING,
    });
    await expect(service.getMe('u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('revokes sessions and hard-deletes the user on account deletion', async () => {
    const result = await service.deleteMe('u1');
    expect(authSessionUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', revokedAt: null },
      data: { revokedAt: expect.any(Date) as Date },
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { status: UserStatus.DELETING },
    });
    expect(userDelete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(result.data.success).toBe(true);
  });
});
