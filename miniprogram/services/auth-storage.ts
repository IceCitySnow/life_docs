const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const DEV_OPEN_ID_KEY = 'dev_open_id';

export function getToken(): string {
  return wx.getStorageSync(TOKEN_KEY) || '';
}

export function setToken(token: string): void {
  wx.setStorageSync(TOKEN_KEY, token);
}

export function clearToken(): void {
  wx.removeStorageSync(TOKEN_KEY);
}

export function getCachedUser(): IAppOption['globalData']['user'] {
  return (wx.getStorageSync(USER_KEY) as IAppOption['globalData']['user']) || null;
}

export function setCachedUser(user: IAppOption['globalData']['user']): void {
  if (user) {
    wx.setStorageSync(USER_KEY, user);
  } else {
    wx.removeStorageSync(USER_KEY);
  }
}

export function clearCachedUser(): void {
  wx.removeStorageSync(USER_KEY);
}

export function getOrCreateDevOpenId(): string {
  const existing = wx.getStorageSync(DEV_OPEN_ID_KEY) as string;
  if (existing) {
    return existing;
  }
  const created = `mp-dev-${Date.now()}`;
  wx.setStorageSync(DEV_OPEN_ID_KEY, created);
  return created;
}
