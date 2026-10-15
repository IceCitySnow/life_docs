import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, UserStatus } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  function createContext(role?: UserRole) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: role
            ? {
                id: 'u1',
                role,
                status: UserStatus.ACTIVE,
                displayName: null,
                avatarUrl: null,
                sessionId: 's1',
              }
            : undefined,
        }),
      }),
    };
  }

  it('allows admin role for admin routes', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      UserRole.ADMIN,
    ]);
    expect(guard.canActivate(createContext(UserRole.ADMIN) as never)).toBe(
      true,
    );
  });

  it('forbids regular users on admin routes', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      UserRole.ADMIN,
    ]);
    expect(() =>
      guard.canActivate(createContext(UserRole.USER) as never),
    ).toThrow(ForbiddenException);
  });
});
