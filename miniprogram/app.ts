import { resolveApiBaseUrl } from './config';
import { setUnauthorizedHandler } from './services/api';
import {
  ensureLogin,
  showLoginExpiredToast,
} from './services/auth';
import { getToken } from './services/auth-storage';
import { isAuthOptOut, setAuthOptOut } from './services/session';

App<IAppOption>({
  globalData: {
    apiBaseUrl: resolveApiBaseUrl(),
    user: null,
    loginReady: null,
    sessionEpoch: 0,
  },

  onLaunch() {
    this.globalData.apiBaseUrl = resolveApiBaseUrl();

    setUnauthorizedHandler(() => {
      showLoginExpiredToast();
      this.globalData.loginReady = ensureLogin(true)
        .then((token) => {
          setAuthOptOut(false);
          return token;
        })
        .catch((error: Error) => {
          this.globalData.loginReady = null;
          console.error('[auth]', error.message);
          throw error;
        });
    });

    if (!isAuthOptOut()) {
      this.globalData.loginReady = this.ensureSession().catch(
        (error: Error) => {
          console.error('[auth]', error.message);
          throw error;
        },
      );
    }
  },

  /**
   * @param options.optional  true = public pages; missing session is OK
   * @param options.forceLogin ignore logout opt-out and run login
   */
  ensureSession(options?: { optional?: boolean; forceLogin?: boolean }) {
    const optional = options?.optional === true;
    const forceLogin = options?.forceLogin === true;

    if (forceLogin) {
      this.globalData.loginReady = ensureLogin(true)
        .then((token) => {
          setAuthOptOut(false);
          return token;
        })
        .catch((error: Error) => {
          this.globalData.loginReady = null;
          throw error;
        });
      return this.globalData.loginReady;
    }

    if (getToken()) {
      if (!this.globalData.loginReady) {
        this.globalData.loginReady = ensureLogin(false).catch(
          (error: Error) => {
            this.globalData.loginReady = null;
            throw error;
          },
        );
      }
      return this.globalData.loginReady;
    }

    if (optional) {
      return Promise.resolve('');
    }

    if (isAuthOptOut()) {
      return Promise.reject(new Error('请先登录后再继续（已退出登录）'));
    }

    this.globalData.loginReady = ensureLogin(false).catch((error: Error) => {
      this.globalData.loginReady = null;
      throw error;
    });
    return this.globalData.loginReady;
  },
});
