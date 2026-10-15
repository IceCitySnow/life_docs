import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportReason } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const recordFindFirst = jest.fn();
  const taskFindFirst = jest.fn();
  const reportCreate = jest.fn();

  const prisma = {
    explorationRecord: { findFirst: recordFindFirst },
    task: { findFirst: taskFindFirst },
    report: { create: reportCreate },
  } as unknown as PrismaService;

  const service = new ReportsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires exactly one target', async () => {
    await expect(
      service.create('u1', { reason: ReportReason.SPAM }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown public record targets', async () => {
    recordFindFirst.mockResolvedValue(null);
    await expect(
      service.create('u1', {
        recordId: 'r1',
        reason: ReportReason.SPAM,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a report for a public record', async () => {
    recordFindFirst.mockResolvedValue({ id: 'r1' });
    reportCreate.mockResolvedValue({
      id: 'rep1',
      recordId: 'r1',
      reason: ReportReason.SPAM,
    });

    const result = await service.create('u1', {
      recordId: 'r1',
      reason: ReportReason.SPAM,
    });
    expect(result.data.id).toBe('rep1');
  });
});
