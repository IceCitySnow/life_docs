import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ListMyTasksQueryDto } from './dto/list-my-tasks-query.dto';
import { UserTasksService } from './user-tasks.service';

@Controller('me/tasks')
@UseGuards(AuthGuard)
export class UserTasksController {
  constructor(private readonly userTasksService: UserTasksService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMyTasksQueryDto,
  ) {
    return this.userTasksService.listMine(user.id, query);
  }

  @Get(':taskId')
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.userTasksService.getMineOne(user.id, taskId);
  }

  @Put(':taskId/favorite')
  setFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.userTasksService.setFavorite(user.id, taskId, true);
  }

  @Delete(':taskId/favorite')
  @HttpCode(200)
  unsetFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.userTasksService.setFavorite(user.id, taskId, false);
  }

  @Put(':taskId/wish')
  setWish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.userTasksService.setWished(user.id, taskId, true);
  }

  @Delete(':taskId/wish')
  @HttpCode(200)
  unsetWish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.userTasksService.setWished(user.id, taskId, false);
  }

  @Post(':taskId/start')
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.userTasksService.start(user.id, taskId);
  }

  @Post(':taskId/complete')
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.userTasksService.complete(user.id, taskId);
  }
}
