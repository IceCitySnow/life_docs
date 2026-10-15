import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminTasksService } from './admin-tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('admin/tasks')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminTasksController {
  constructor(private readonly adminTasksService: AdminTasksService) {}

  @Post()
  create(@Body() dto: CreateTaskDto) {
    return this.adminTasksService.create(dto);
  }

  @Patch(':taskId')
  update(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.adminTasksService.update(taskId, dto);
  }

  @Post(':taskId/publish')
  publish(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.adminTasksService.publish(taskId);
  }

  @Post(':taskId/archive')
  archive(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.adminTasksService.archive(taskId);
  }
}
