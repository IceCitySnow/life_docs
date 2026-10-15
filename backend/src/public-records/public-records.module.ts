import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { PublicRecordsController } from './public-records.controller';
import { PublicRecordsService } from './public-records.service';

@Module({
  imports: [AuthModule],
  controllers: [PublicRecordsController],
  providers: [PublicRecordsService, RateLimitGuard],
})
export class PublicRecordsModule {}
