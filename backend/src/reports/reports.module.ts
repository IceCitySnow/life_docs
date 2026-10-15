import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [AuthModule],
  controllers: [ReportsController],
  providers: [ReportsService, RateLimitGuard],
})
export class ReportsModule {}
