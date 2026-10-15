import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PublicRecordsService } from './public-records.service';

@Controller('public/records')
export class PublicRecordsController {
  constructor(
    private readonly publicRecordsService: PublicRecordsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async list(@Query() query: PaginationQueryDto, @Req() request: Request) {
    const viewerId = await this.tryGetUserId(request);
    return this.publicRecordsService.list(query, viewerId);
  }

  @Get(':recordId')
  async getById(
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Req() request: Request,
  ) {
    const viewerId = await this.tryGetUserId(request);
    return this.publicRecordsService.getById(recordId, viewerId);
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
