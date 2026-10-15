import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AtlasController } from './atlas.controller';
import { AtlasService } from './atlas.service';

@Module({
  imports: [AuthModule],
  controllers: [AtlasController],
  providers: [AtlasService],
})
export class AtlasModule {}
