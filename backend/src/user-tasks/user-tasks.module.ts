import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserTasksController } from './user-tasks.controller';
import { UserTasksService } from './user-tasks.service';

@Module({
  imports: [AuthModule],
  controllers: [UserTasksController],
  providers: [UserTasksService],
  exports: [UserTasksService],
})
export class UserTasksModule {}
