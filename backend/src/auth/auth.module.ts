import { Module } from '@nestjs/common';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { WechatService } from './wechat.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    WechatService,
    AuthGuard,
    RolesGuard,
    RateLimitGuard,
  ],
  exports: [AuthService, AuthGuard, RolesGuard],
})
export class AuthModule {}
