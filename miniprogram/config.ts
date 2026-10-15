/**
 * Mini program API / env configuration.
 *
 * - develop / trial: local HTTP + optional storage override + optional dev-login
 * - release: HTTPS production URL only; storage override must also be HTTPS
 *   and must not point at localhost / private hosts
 *
 * Before WeChat release upload, set PRODUCTION_API_BASE_URL to the registered
 * HTTPS request 合法域名 (must match WeChat admin console).
 */

/** Development / simulator default. */
export const DEVELOPMENT_API_BASE_URL = 'http://localhost:3000/api/v1';

/**
 * Official release API origin. Replace before first production upload.
 * Must be https:// and must not use localhost.
 */
export const PRODUCTION_API_BASE_URL =
  'https://api.example.com/api/v1';

export const API_BASE_URL_STORAGE_KEY = 'api_base_url';

export type MiniProgramEnvVersion = 'develop' | 'trial' | 'release';

export function getMiniProgramEnvVersion(): MiniProgramEnvVersion {
  try {
    const version = wx.getAccountInfoSync().miniProgram.envVersion;
    if (version === 'release' || version === 'trial' || version === 'develop') {
      return version;
    }
  } catch {
    // Simulator / incomplete typings fall back to develop.
  }
  return 'develop';
}

export function isReleaseBuild(
  envVersion: MiniProgramEnvVersion = getMiniProgramEnvVersion(),
): boolean {
  return envVersion === 'release';
}

/**
 * Dev-login fallback is only allowed outside release builds.
 * Pass `envVersion` in unit tests to avoid depending on wx runtime.
 */
export function isDevLoginAllowed(
  envVersion: MiniProgramEnvVersion = getMiniProgramEnvVersion(),
): boolean {
  return envVersion !== 'release';
}

function isLocalOrPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local')
  ) {
    return true;
  }
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) {
    return true;
  }
  if (/^192\.168\.\d+\.\d+$/.test(host)) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) {
    return true;
  }
  return false;
}

/**
 * Validate an API base URL for the current (or forced) env.
 * Returns normalized URL without trailing slash, or an error message.
 */
export function validateApiBaseUrl(
  raw: string,
  options?: { release?: boolean },
): { ok: true; url: string } | { ok: false; reason: string } {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) {
    return { ok: false, reason: 'API 地址为空' };
  }

  let parsed: { protocol: string; hostname: string };
  try {
    // WeChat JS runtime may not have URL; use regex fallback.
    const match = /^([a-z]+):\/\/([^/?#]+)/i.exec(trimmed);
    if (!match) {
      return { ok: false, reason: 'API 地址格式无效' };
    }
    parsed = { protocol: match[1].toLowerCase(), hostname: match[2] };
  } catch {
    return { ok: false, reason: 'API 地址无法解析' };
  }

  const release = options?.release ?? isReleaseBuild();

  if (release) {
    if (parsed.protocol !== 'https') {
      return { ok: false, reason: '正式版仅允许 HTTPS API 地址' };
    }
    if (isLocalOrPrivateHost(parsed.hostname)) {
      return { ok: false, reason: '正式版不允许使用本地/内网 API 地址' };
    }
    if (
      parsed.hostname === 'api.example.com' ||
      trimmed.includes('REPLACE_WITH_YOUR_API_DOMAIN')
    ) {
      return {
        ok: false,
        reason:
          '正式版尚未配置 PRODUCTION_API_BASE_URL，请先改为微信合法域名 HTTPS 地址',
      };
    }
  } else if (parsed.protocol !== 'http' && parsed.protocol !== 'https') {
    return { ok: false, reason: 'API 地址协议无效' };
  }

  return { ok: true, url: trimmed };
}

export function resolveApiBaseUrl(): string {
  const release = isReleaseBuild();
  const builtIn = release
    ? PRODUCTION_API_BASE_URL
    : DEVELOPMENT_API_BASE_URL;

  const override = wx.getStorageSync(API_BASE_URL_STORAGE_KEY) as string;
  if (typeof override === 'string' && override.trim()) {
    const checked = validateApiBaseUrl(override, { release });
    if (checked.ok) {
      return checked.url;
    }
    // Production: ignore unsafe storage overrides instead of sending HTTP.
    if (release) {
      console.warn('[config] ignored unsafe api_base_url override:', checked.reason);
    }
  }

  const fallback = validateApiBaseUrl(builtIn, { release });
  if (!fallback.ok) {
    // Still return built-in for develop; release will fail at request time.
    console.error('[config]', fallback.reason);
    return builtIn.replace(/\/$/, '');
  }
  return fallback.url;
}

/** Throw if current base URL is unsafe for this env (used by request layer). */
export function assertRequestBaseUrlAllowed(baseUrl: string): void {
  const checked = validateApiBaseUrl(baseUrl, { release: isReleaseBuild() });
  if (!checked.ok) {
    throw new Error(checked.reason);
  }
}
