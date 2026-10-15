import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { RecordReactionsService } from './record-reactions.service';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';

@Module({
  imports: [AuthModule],
  controllers: [RecordsController],
  providers: [RecordsService, RecordReactionsService, RateLimitGuard],
  exports: [RecordsService],
})
export class RecordsModule {}
