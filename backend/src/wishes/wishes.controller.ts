import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateWishDto } from './dto/update-wish.dto';
import { WishesService } from './wishes.service';

@Controller('me/wishes')
@UseGuards(AuthGuard)
export class WishesController {
  constructor(private readonly wishesService: WishesService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWishDto) {
    return this.wishesService.create(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.wishesService.listMine(user.id, query);
  }

  @Patch(':wishId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('wishId', ParseUUIDPipe) wishId: string,
    @Body() dto: UpdateWishDto,
  ) {
    return this.wishesService.update(user.id, wishId, dto);
  }

  @Delete(':wishId')
  @HttpCode(200)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('wishId', ParseUUIDPipe) wishId: string,
  ) {
    return this.wishesService.remove(user.id, wishId);
  }

  @Post(':wishId/complete')
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('wishId', ParseUUIDPipe) wishId: string,
  ) {
    return this.wishesService.complete(user.id, wishId);
  }
}
