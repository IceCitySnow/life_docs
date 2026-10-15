import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AtlasModule } from './atlas/atlas.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { RequestLoggingMiddleware } from './common/logging/request-logging.middleware';
import { AppConfigModule } from './config/app-config.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicRecordsModule } from './public-records/public-records.module';
import { RecordsModule } from './records/records.module';
import { ReportsModule } from './reports/reports.module';
import { TasksModule } from './tasks/tasks.module';
import { UserTasksModule } from './user-tasks/user-tasks.module';
import { UsersModule } from './users/users.module';
import { WishesModule } from './wishes/wishes.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
    CategoriesModule,
    TasksModule,
    AdminModule,
    UserTasksModule,
    WishesModule,
    RecordsModule,
    PublicRecordsModule,
    ReportsModule,
    AtlasModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
