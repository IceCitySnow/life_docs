import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  it('returns wrapped health data when database is up', async () => {
    const healthService = {
      check: jest.fn().mockResolvedValue({
        status: 'ok',
        database: 'up',
        timestamp: '2026-10-14T00:00:00.000Z',
      }),
    } as unknown as HealthService;
    const controller = new HealthController(healthService);

    await expect(controller.getHealth()).resolves.toEqual({
      data: {
        status: 'ok',
        database: 'up',
        timestamp: '2026-10-14T00:00:00.000Z',
      },
    });
  });

  it('throws service unavailable when database is down', async () => {
    const healthService = {
      check: jest.fn().mockResolvedValue({
        status: 'degraded',
        database: 'down',
        timestamp: '2026-10-14T00:00:00.000Z',
      }),
    } as unknown as HealthService;
    const controller = new HealthController(healthService);

    await expect(controller.getHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
