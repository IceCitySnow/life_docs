import { assertRequestBaseUrlAllowed } from '../config';
import { clearToken, getToken } from './auth-storage';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  path: string;
  method?: HttpMethod;
  data?: WechatMiniprogram.IAnyObject | string;
  /** When true, attach Bearer token if present. Default true. */
  auth?: boolean;
  /** Skip automatic 401 re-login prompt. */
  skipAuthRedirect?: boolean;
};

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

export class ApiError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code = 'REQUEST_FAILED') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

let unauthorizedHandler: (() => void) | null = null;

/** Register a one-time UI hook for session expiry (set from app.ts). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function buildQuery(data?: WechatMiniprogram.IAnyObject): string {
  if (!data) {
    return '';
  }
  const parts: string[] = [];
  Object.keys(data).forEach((key) => {
    const value = data[key];
    if (value === undefined || value === null || value === '') {
      return;
    }
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  });
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * Unified API request helper for /api/v1.
 * Resolves with the full JSON body ({ data, pagination? }).
 */
export function requestApi<T>(options: RequestOptions): Promise<T> {
  const app = getApp<IAppOption>();
  const baseUrl = app.globalData.apiBaseUrl.replace(/\/$/, '');
  const method = options.method ?? 'GET';
  const useAuth = options.auth !== false;
  const token = useAuth ? getToken() : '';

  try {
    assertRequestBaseUrlAllowed(baseUrl);
  } catch (error) {
    return Promise.reject(
      new ApiError(
        error instanceof Error ? error.message : 'API 地址不安全，已阻止请求',
        0,
        'UNSAFE_API_BASE_URL',
      ),
    );
  }

  let url = `${baseUrl}${options.path}`;
  let body: WechatMiniprogram.IAnyObject | string | undefined = options.data;

  if (method === 'GET' && options.data && typeof options.data === 'object') {
    url += buildQuery(options.data);
    body = undefined;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: method as WechatMiniprogram.RequestOption['method'],
      data: body,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
          return;
        }

        const bodyJson = res.data as ApiErrorBody;
        const message =
          bodyJson.error?.message ||
          bodyJson.message ||
          `请求失败（${res.statusCode}）`;
        const code = bodyJson.error?.code || 'REQUEST_FAILED';

        if (res.statusCode === 401 && !options.skipAuthRedirect) {
          clearToken();
          if (unauthorizedHandler) {
            unauthorizedHandler();
          }
        }

        reject(new ApiError(message, res.statusCode, code));
      },
      fail(err) {
        reject(new ApiError(err.errMsg || '网络异常，请检查后端是否启动', 0, 'NETWORK'));
      },
    });
  });
}

export function getErrorMessage(error: unknown, fallback = '操作失败'): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
