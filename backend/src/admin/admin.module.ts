import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminReportsController } from './reports/admin-reports.controller';
import { AdminReportsService } from './reports/admin-reports.service';
import { AdminTasksController } from './tasks/admin-tasks.controller';
import { AdminTasksService } from './tasks/admin-tasks.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminTasksController, AdminReportsController],
  providers: [AdminTasksService, AdminReportsService],
})
export class AdminModule {}
