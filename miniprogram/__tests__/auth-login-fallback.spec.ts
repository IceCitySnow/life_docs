/**
 * Ensures release builds never call /auth/dev-login when WeChat login fails.
 */

const mockRequestApi = jest.fn();
const mockGetToken = jest.fn();
const mockClearToken = jest.fn();
const mockClearCachedUser = jest.fn();
const mockSetToken = jest.fn();
const mockSetCachedUser = jest.fn();
const mockGetOrCreateDevOpenId = jest.fn();
const mockBumpSessionEpoch = jest.fn(() => 1);
const mockSetAuthOptOut = jest.fn();

let mockEnvVersion: 'develop' | 'trial' | 'release' = 'release';

jest.mock('../config', () => {
  const actual = jest.requireActual('../config') as typeof import('../config');
  return {
    ...actual,
    getMiniProgramEnvVersion: () => mockEnvVersion,
    isReleaseBuild: () => mockEnvVersion === 'release',
    isDevLoginAllowed: () => mockEnvVersion !== 'release',
  };
});

jest.mock('../services/api', () => {
  class ApiError extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, statusCode = 0, code = 'ERROR') {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
    }
  }
  return {
    ApiError,
    getErrorMessage: (error: unknown, fallback: string) =>
      error instanceof Error ? error.message : fallback,
    requestApi: (...args: unknown[]) => mockRequestApi(...args),
  };
});

jest.mock('../services/auth-storage', () => ({
  getToken: () => mockGetToken(),
  clearToken: () => mockClearToken(),
  clearCachedUser: () => mockClearCachedUser(),
  setToken: (...args: unknown[]) => mockSetToken(...args),
  setCachedUser: (...args: unknown[]) => mockSetCachedUser(...args),
  getOrCreateDevOpenId: () => mockGetOrCreateDevOpenId(),
  getCachedUser: () => null,
}));

jest.mock('../services/session', () => ({
  bumpSessionEpoch: () => mockBumpSessionEpoch(),
  setAuthOptOut: (...args: unknown[]) => mockSetAuthOptOut(...args),
}));

import { ensureLogin } from '../services/auth';
import { ApiError } from '../services/api';

describe('ensureLogin production fallback isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnvVersion = 'release';
    mockGetToken.mockReturnValue('');
    mockGetOrCreateDevOpenId.mockReturnValue('mp-dev-openid');

    (global as { wx?: unknown }).wx = {
      login: ({
        fail,
      }: {
        success?: (res: { code: string }) => void;
        fail?: (err: { errMsg: string }) => void;
      }) => {
        fail?.({ errMsg: 'wx.login:fail simulated' });
      },
      getStorageSync: () => '',
      setStorageSync: () => undefined,
      removeStorageSync: () => undefined,
      showToast: () => undefined,
    };

    (global as { getApp?: unknown }).getApp = () => ({
      globalData: { user: null, sessionEpoch: 0, loginReady: null },
    });
  });

  it('release: WeChat login failure does not request /auth/dev-login or set a token', async () => {
    await expect(ensureLogin(true)).rejects.toBeInstanceOf(ApiError);

    const paths = mockRequestApi.mock.calls.map(
      (call: [{ path?: string }]) => call[0]?.path,
    );
    expect(paths).not.toContain('/auth/dev-login');
    expect(mockSetToken).not.toHaveBeenCalled();
    expect(mockGetOrCreateDevOpenId).not.toHaveBeenCalled();
  });

  it('develop: WeChat login failure may fall back to /auth/dev-login', async () => {
    mockEnvVersion = 'develop';
    mockRequestApi.mockResolvedValue({
      data: {
        accessToken: 'dev-token',
        tokenType: 'Bearer',
        expiresAt: new Date().toISOString(),
        user: {
          id: 'u1',
          displayName: 'Dev',
          avatarUrl: null,
          role: 'USER',
          status: 'ACTIVE',
        },
      },
    });

    const token = await ensureLogin(true);

    expect(token).toBe('dev-token');
    const paths = mockRequestApi.mock.calls.map(
      (call: [{ path?: string }]) => call[0]?.path,
    );
    expect(paths).toContain('/auth/dev-login');
    expect(mockSetToken).toHaveBeenCalledWith('dev-token');
  });
});
