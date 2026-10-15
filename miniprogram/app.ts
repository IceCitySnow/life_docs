import { resolveApiBaseUrl } from './config';
import { setUnauthorizedHandler } from './services/api';
import { ensureLogin, showLoginExpiredToast } from './services/auth';

App<IAppOption>({
  globalData: {
    apiBaseUrl: resolveApiBaseUrl(),
    user: null,
    loginReady: null,
  },

  onLaunch() {
    this.globalData.apiBaseUrl = resolveApiBaseUrl();

    setUnauthorizedHandler(() => {
      showLoginExpiredToast();
      this.globalData.loginReady = ensureLogin(true).catch(() => '');
    });

    this.globalData.loginReady = this.ensureSession();
  },

  ensureSession() {
    if (!this.globalData.loginReady) {
      this.globalData.loginReady = ensureLogin().catch((error: Error) => {
        this.globalData.loginReady = null;
        console.error('[auth]', error.message);
        throw error;
      });
    }
    return this.globalData.loginReady;
  },
});
