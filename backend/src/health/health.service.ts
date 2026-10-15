import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type HealthStatus = {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  timestamp: string;
};

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    const databaseUp = await this.prisma.isDatabaseHealthy();

    return {
      status: databaseUp ? 'ok' : 'degraded',
      database: databaseUp ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };
  }
}
