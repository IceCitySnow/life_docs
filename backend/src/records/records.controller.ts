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
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthService } from '../auth/auth.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { CreateRecordDto } from './dto/create-record.dto';
import { RecordReactionsService } from './record-reactions.service';
import { UpdateRecordDto } from './dto/update-record.dto';
import { RecordsService } from './records.service';

@Controller('records')
export class RecordsController {
  constructor(
    private readonly recordsService: RecordsService,
    private readonly recordReactionsService: RecordReactionsService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRecordDto) {
    return this.recordsService.create(user.id, dto);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.recordsService.listMine(user.id, query);
  }

  @Put(':recordId/like')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit({ limit: 60, windowMs: 60_000, key: 'records.like' })
  like(
    @CurrentUser() user: AuthenticatedUser,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ) {
    return this.recordReactionsService.setLike(user.id, recordId, true);
  }

  @Delete(':recordId/like')
  @UseGuards(AuthGuard, RateLimitGuard)
  @HttpCode(200)
  @RateLimit({ limit: 60, windowMs: 60_000, key: 'records.like' })
  unlike(
    @CurrentUser() user: AuthenticatedUser,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ) {
    return this.recordReactionsService.setLike(user.id, recordId, false);
  }

  @Put(':recordId/favorite')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit({ limit: 60, windowMs: 60_000, key: 'records.favorite' })
  favorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ) {
    return this.recordReactionsService.setFavorite(user.id, recordId, true);
  }

  @Delete(':recordId/favorite')
  @UseGuards(AuthGuard, RateLimitGuard)
  @HttpCode(200)
  @RateLimit({ limit: 60, windowMs: 60_000, key: 'records.favorite' })
  unfavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ) {
    return this.recordReactionsService.setFavorite(user.id, recordId, false);
  }

  @Get(':recordId')
  async getById(
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Req() request: Request,
  ) {
    const viewerId = await this.tryGetUserId(request);
    return this.recordsService.getById(viewerId, recordId);
  }

  @Patch(':recordId')
  @UseGuards(AuthGuard)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() dto: UpdateRecordDto,
  ) {
    return this.recordsService.update(user.id, recordId, dto);
  }

  @Delete(':recordId')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ) {
    return this.recordsService.remove(user.id, recordId);
  }

  private async tryGetUserId(request: Request): Promise<string | undefined> {
    const header = request.headers.authorization;
    if (!header) {
      return undefined;
    }
    const [scheme, value] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !value) {
      return undefined;
    }
    try {
      const user = await this.authService.authenticateBearerToken(value.trim());
      return user.id;
    } catch {
      return undefined;
    }
  }
}
