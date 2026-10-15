import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { WechatService } from './wechat.service';
import { hashSessionToken } from './token.util';

describe('AuthService', () => {
  const userFindUnique = jest.fn();
  const userCreate = jest.fn();
  const userUpdate = jest.fn();
  const sessionCreate = jest.fn();
  const sessionFindUnique = jest.fn();
  const sessionUpdateMany = jest.fn();

  const prisma = {
    user: {
      findUnique: userFindUnique,
      create: userCreate,
      update: userUpdate,
    },
    authSession: {
      create: sessionCreate,
      findUnique: sessionFindUnique,
      updateMany: sessionUpdateMany,
    },
  } as unknown as PrismaService;

  const config = {
    isDevAuthEnabled: jest.fn(),
    getOrThrow: jest.fn().mockReturnValue(3600),
    get: jest.fn(),
  } as unknown as AppConfigService;

  const wechatService = {
    exchangeCode: jest.fn(),
  } as unknown as WechatService;

  const service = new AuthService(prisma, config, wechatService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides dev login when ENABLE_DEV_AUTH is off', async () => {
    (config.isDevAuthEnabled as jest.Mock).mockReturnValue(false);
    await expect(
      service.loginWithDevOpenId('seed-user-openid'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(userCreate).not.toHaveBeenCalled();
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it('issues a session for wechat login without leaking session_key', async () => {
    (wechatService.exchangeCode as jest.Mock).mockResolvedValue({
      openId: 'wx-open-1',
    });
    userFindUnique.mockResolvedValue(null);
    userCreate.mockResolvedValue({
      id: 'u1',
      wxOpenId: 'wx-open-1',
      displayName: null,
      avatarUrl: null,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    sessionCreate.mockResolvedValue({ id: 's1' });

    const result = await service.loginWithWechatCode('code-1');

    expect(result.data.accessToken).toEqual(expect.any(String));
    expect(result.data.user).not.toHaveProperty('wxOpenId');
    expect(JSON.stringify(result)).not.toContain('session_key');
    expect(sessionCreate).toHaveBeenCalledTimes(1);
    const createCalls = sessionCreate.mock.calls as Array<
      [{ data: { userId: string; tokenHash: string } }]
    >;
    expect(createCalls[0]?.[0].data.userId).toBe('u1');
    expect(createCalls[0]?.[0].data.tokenHash).toBe(
      hashSessionToken(result.data.accessToken),
    );
  });

  it('rejects revoked or expired sessions', async () => {
    sessionFindUnique.mockResolvedValue({
      id: 's1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 10_000),
      user: {
        id: 'u1',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        displayName: null,
        avatarUrl: null,
      },
    });

    await expect(service.authenticateBearerToken('token')).rejects.toBeTruthy();
  });

  it('rejects expired sessions even when not revoked', async () => {
    sessionFindUnique.mockResolvedValue({
      id: 's1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1_000),
      user: {
        id: 'u1',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        displayName: null,
        avatarUrl: null,
      },
    });

    await expect(service.authenticateBearerToken('token')).rejects.toBeTruthy();
  });

  it('does not reactivate DELETING accounts on login', async () => {
    (config.isDevAuthEnabled as jest.Mock).mockReturnValue(true);
    userFindUnique.mockResolvedValue({
      id: 'u1',
      wxOpenId: 'deleting-openid',
      displayName: null,
      avatarUrl: null,
      role: UserRole.USER,
      status: UserStatus.DELETING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.loginWithDevOpenId('deleting-openid'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(userUpdate).not.toHaveBeenCalled();
    expect(sessionCreate).not.toHaveBeenCalled();
  });
});
