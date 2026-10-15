import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AtlasService } from './atlas.service';

@Controller('atlas')
@UseGuards(AuthGuard)
export class AtlasController {
  constructor(private readonly atlasService: AtlasService) {}

  @Get('me')
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.atlasService.getMine(user.id);
  }
}
