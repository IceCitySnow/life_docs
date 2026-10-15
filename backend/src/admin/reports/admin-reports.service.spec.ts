import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContentModerationStatus, ReportStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminReportsService } from './admin-reports.service';

describe('AdminReportsService', () => {
  const findUnique = jest.fn();
  const reportUpdate = jest.fn();
  const recordUpdate = jest.fn();

  const prisma = {
    report: {
      findUnique,
      count: jest.fn(),
      findMany: jest.fn(),
      update: reportUpdate,
    },
    explorationRecord: { update: recordUpdate },
    $transaction: async (
      fn: (tx: {
        report: { update: typeof reportUpdate };
        explorationRecord: { update: typeof recordUpdate };
      }) => Promise<unknown>,
    ) =>
      fn({
        report: { update: reportUpdate },
        explorationRecord: { update: recordUpdate },
      }),
  } as unknown as PrismaService;

  const service = new AdminReportsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects setting status back to PENDING', async () => {
    await expect(
      service.handle('admin', 'rep1', { status: ReportStatus.PENDING }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('hides record content when requested', async () => {
    findUnique.mockResolvedValue({ id: 'rep1', recordId: 'r1' });
    reportUpdate.mockResolvedValue({
      id: 'rep1',
      recordId: 'r1',
      status: ReportStatus.RESOLVED,
      record: { id: 'r1', moderationStatus: ContentModerationStatus.VISIBLE },
    });
    recordUpdate.mockResolvedValue({ id: 'r1' });

    await service.handle('admin', 'rep1', {
      status: ReportStatus.RESOLVED,
      hideContent: true,
      resolutionNote: 'removed',
    });

    expect(recordUpdate).toHaveBeenCalled();
    const calls = recordUpdate.mock.calls as Array<
      [
        {
          where: { id: string };
          data: { moderationStatus: ContentModerationStatus };
        },
      ]
    >;
    const updateArg = calls[0][0];
    expect(updateArg.where.id).toBe('r1');
    expect(updateArg.data.moderationStatus).toBe(
      ContentModerationStatus.HIDDEN,
    );
  });

  it('returns not found for missing reports', async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      service.handle('admin', 'missing', { status: ReportStatus.REJECTED }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
