import {
  isDevLoginAllowed,
  isReleaseBuild,
} from '../config';
import type { ApiDataResponse, LoginResult, PublicUser } from '../types/api';
import { ApiError, getErrorMessage, requestApi } from './api';
import {
  clearCachedUser,
  clearToken,
  getOrCreateDevOpenId,
  getToken,
  setCachedUser,
  setToken,
} from './auth-storage';
import { bumpSessionEpoch, setAuthOptOut } from './session';

export {
  clearCachedUser,
  clearToken,
  getCachedUser,
  getToken,
  setCachedUser,
  setToken,
} from './auth-storage';

function applySession(result: LoginResult): string {
  setToken(result.accessToken);
  setCachedUser(result.user);
  setAuthOptOut(false);
  const epoch = bumpSessionEpoch();
  const app = getApp<IAppOption>();
  app.globalData.user = result.user;
  app.globalData.sessionEpoch = epoch;
  return result.accessToken;
}

async function loginWithWechatCode(code: string): Promise<string> {
  const res = await requestApi<ApiDataResponse<LoginResult>>({
    path: '/auth/wechat',
    method: 'POST',
    data: { code },
    auth: false,
    skipAuthRedirect: true,
  });
  return applySession(res.data);
}

async function loginWithDev(): Promise<string> {
  if (!isDevLoginAllowed()) {
    throw new ApiError(
      '正式版不支持开发登录。请使用微信登录，或检查生产 API / 微信配置。',
      0,
      'DEV_LOGIN_DISABLED',
    );
  }

  const wxOpenId = getOrCreateDevOpenId();
  const res = await requestApi<ApiDataResponse<LoginResult>>({
    path: '/auth/dev-login',
    method: 'POST',
    data: {
      wxOpenId,
      displayName: '开发者工具用户',
    },
    auth: false,
    skipAuthRedirect: true,
  });
  return applySession(res.data);
}

function wxLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (res.code) {
          resolve(res.code);
          return;
        }
        reject(new Error('wx.login 未返回 code'));
      },
      fail(err) {
        reject(new Error(err.errMsg || 'wx.login 失败'));
      },
    });
  });
}

async function validateToken(token: string): Promise<PublicUser | null> {
  try {
    const res = await requestApi<ApiDataResponse<PublicUser>>({
      path: '/auth/me',
      auth: true,
      skipAuthRedirect: true,
    });
    void token;
    return res.data;
  } catch {
    return null;
  }
}

/**
 * Ensure a valid session exists.
 * WeChat code exchange first. Dev-login fallback only outside release builds.
 */
export async function ensureLogin(force = false): Promise<string> {
  if (!force) {
    const existing = getToken();
    if (existing) {
      const user = await validateToken(existing);
      if (user) {
        setCachedUser(user);
        setAuthOptOut(false);
        getApp<IAppOption>().globalData.user = user;
        return existing;
      }
      clearToken();
      clearCachedUser();
    }
  } else {
    clearToken();
    clearCachedUser();
  }

  try {
    const code = await wxLoginCode();
    return await loginWithWechatCode(code);
  } catch (wechatError) {
    if (!isDevLoginAllowed()) {
      throw new ApiError(
        `${getErrorMessage(wechatError, '微信登录失败')}。请稍后重试，或检查网络与微信开放平台配置。`,
        0,
        'LOGIN_FAILED',
      );
    }

    try {
      return await loginWithDev();
    } catch (devError) {
      const message = [
        getErrorMessage(wechatError, '微信登录失败'),
        getErrorMessage(devError, '开发登录失败'),
      ].join('；');
      throw new ApiError(
        `${message}。开发联调请确认后端已启动且 ENABLE_DEV_AUTH=true（仅非正式版）。当前环境：${isReleaseBuild() ? 'release' : 'develop/trial'}。`,
        0,
        'LOGIN_FAILED',
      );
    }
  }
}

export async function logout(): Promise<void> {
  const token = getToken();
  if (token) {
    try {
      await requestApi({
        path: '/auth/logout',
        method: 'POST',
        skipAuthRedirect: true,
      });
    } catch {
      // Local clear still proceeds.
    }
  }
  clearToken();
  clearCachedUser();
  setAuthOptOut(true);
  const epoch = bumpSessionEpoch();
  const app = getApp<IAppOption>();
  app.globalData.user = null;
  app.globalData.loginReady = null;
  app.globalData.sessionEpoch = epoch;
}

export function showLoginExpiredToast(): void {
  wx.showToast({
    title: '登录已失效，正在重新登录',
    icon: 'none',
    duration: 2000,
  });
}
