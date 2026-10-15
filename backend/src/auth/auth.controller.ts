import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { DevLoginDto } from './dto/dev-login.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import type { AuthenticatedUser } from './auth.types';
import { AuthGuard } from './guards/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wechat')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 30, windowMs: 60_000, key: 'auth.wechat' })
  loginWithWechat(@Body() dto: WechatLoginDto) {
    return this.authService.loginWithWechatCode(dto.code);
  }

  @Post('dev-login')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 60_000, key: 'auth.dev-login' })
  loginWithDev(@Body() dto: DevLoginDto) {
    return this.authService.loginWithDevOpenId(dto.wxOpenId, dto.displayName);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user.sessionId);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }
}
