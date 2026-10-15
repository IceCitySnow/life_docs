import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminReportsService } from './admin-reports.service';
import { HandleReportDto } from './dto/handle-report.dto';
import { ListReportsQueryDto } from './dto/list-reports-query.dto';

@Controller('admin/reports')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  @Get()
  list(@Query() query: ListReportsQueryDto) {
    return this.adminReportsService.list(query);
  }

  @Patch(':reportId')
  handle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: HandleReportDto,
  ) {
    return this.adminReportsService.handle(user.id, reportId, dto);
  }
}
