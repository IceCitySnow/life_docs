import {
  BadGatewayException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';

type WechatCode2SessionResponse = {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

@Injectable()
export class WechatService {
  constructor(private readonly config: AppConfigService) {}

  async exchangeCode(code: string): Promise<{ openId: string }> {
    const appId = this.config.get('WECHAT_APP_ID');
    const appSecret = this.config.get('WECHAT_APP_SECRET');

    if (!appId || !appSecret) {
      throw new BadGatewayException({
        code: 'WECHAT_NOT_CONFIGURED',
        message: 'WeChat login is not configured on this server.',
      });
    }

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', appSecret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    let payload: WechatCode2SessionResponse;
    try {
      const response = await fetch(url);
      payload = (await response.json()) as WechatCode2SessionResponse;
    } catch {
      throw new BadGatewayException({
        code: 'WECHAT_UNAVAILABLE',
        message: 'Failed to contact WeChat login service.',
      });
    }

    if (payload.errcode || !payload.openid) {
      throw new UnauthorizedException({
        code: 'WECHAT_LOGIN_FAILED',
        message: 'WeChat login failed.',
      });
    }

    // session_key is intentionally never returned to callers/clients.
    return { openId: payload.openid };
  }
}
