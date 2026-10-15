import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard, RateLimitGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @RateLimit({ limit: 10, windowMs: 60_000, key: 'reports.create' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user.id, dto);
  }
}
