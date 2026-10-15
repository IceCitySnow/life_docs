import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WishesController } from './wishes.controller';
import { WishesService } from './wishes.service';

@Module({
  imports: [AuthModule],
  controllers: [WishesController],
  providers: [WishesService],
  exports: [WishesService],
})
export class WishesModule {}
