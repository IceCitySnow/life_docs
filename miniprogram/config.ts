/**
 * Runtime API configuration.
 * - Local: http://localhost:3000/api/v1
 * - Production: set to the HTTPS origin registered in WeChat admin,
 *   or override at runtime via storage key `api_base_url`.
 */
export const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/v1';

export const API_BASE_URL_STORAGE_KEY = 'api_base_url';

export function resolveApiBaseUrl(): string {
  const override = wx.getStorageSync(API_BASE_URL_STORAGE_KEY) as string;
  if (typeof override === 'string' && /^https?:\/\//i.test(override.trim())) {
    return override.trim().replace(/\/$/, '');
  }
  return DEFAULT_API_BASE_URL.replace(/\/$/, '');
}
