import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthService', () => {
  it('returns ok when database is healthy', async () => {
    const prisma = {
      isDatabaseHealthy: jest.fn().mockResolvedValue(true),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns degraded when database is down', async () => {
    const prisma = {
      isDatabaseHealthy: jest.fn().mockResolvedValue(false),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.database).toBe('down');
  });
});
