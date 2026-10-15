const AUTH_OPT_OUT_KEY = 'auth_opt_out';
const SESSION_EPOCH_KEY = 'session_epoch';

/** User explicitly logged out / deleted account — do not auto-login. */
export function isAuthOptOut(): boolean {
  return Boolean(wx.getStorageSync(AUTH_OPT_OUT_KEY));
}

export function setAuthOptOut(value: boolean): void {
  if (value) {
    wx.setStorageSync(AUTH_OPT_OUT_KEY, true);
  } else {
    wx.removeStorageSync(AUTH_OPT_OUT_KEY);
  }
}

/** Bump when login/logout/delete so tabs can detect stale personal data. */
export function bumpSessionEpoch(): number {
  const next = (Number(wx.getStorageSync(SESSION_EPOCH_KEY)) || 0) + 1;
  wx.setStorageSync(SESSION_EPOCH_KEY, next);
  return next;
}

export function getSessionEpoch(): number {
  return Number(wx.getStorageSync(SESSION_EPOCH_KEY)) || 0;
}
