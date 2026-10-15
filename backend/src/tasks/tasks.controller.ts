import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list(@Query() query: ListTasksQueryDto) {
    return this.tasksService.listPublished(query);
  }

  @Get('recommended')
  recommended(@Query() query: PaginationQueryDto) {
    return this.tasksService.listRecommended(query.page, query.pageSize);
  }

  @Get(':taskId')
  getById(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.tasksService.getPublishedById(taskId);
  }
}
