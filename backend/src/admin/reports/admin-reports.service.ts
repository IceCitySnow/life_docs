import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentModerationStatus, Prisma, ReportStatus } from '@prisma/client';
import { buildPagination } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { HandleReportDto } from './dto/handle-report.dto';
import { ListReportsQueryDto } from './dto/list-reports-query.dto';

@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListReportsQueryDto) {
    const where: Prisma.ReportWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.report.count({ where }),
      this.prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: {
              id: true,
              displayName: true,
              status: true,
            },
          },
          handledBy: {
            select: {
              id: true,
              displayName: true,
            },
          },
          record: {
            select: {
              id: true,
              titleSnapshot: true,
              visibility: true,
              moderationStatus: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: items,
      pagination: buildPagination(query.page, query.pageSize, total),
    };
  }

  async handle(adminUserId: string, reportId: string, dto: HandleReportDto) {
    if (dto.status === ReportStatus.PENDING) {
      throw new BadRequestException({
        code: 'INVALID_REPORT_STATUS',
        message: 'Cannot set report status back to PENDING.',
      });
    }

    const existing = await this.prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Report not found.',
      });
    }

    const handledAt = new Date();

    const data = await this.prisma.$transaction(async (tx) => {
      const report = await tx.report.update({
        where: { id: reportId },
        data: {
          status: dto.status,
          resolutionNote: dto.resolutionNote?.trim() || null,
          handledAt,
          handledByUserId: adminUserId,
        },
        include: {
          record: {
            select: {
              id: true,
              moderationStatus: true,
            },
          },
        },
      });

      if (
        dto.hideContent &&
        report.recordId &&
        (dto.status === ReportStatus.RESOLVED ||
          dto.status === ReportStatus.REVIEWED)
      ) {
        await tx.explorationRecord.update({
          where: { id: report.recordId },
          data: {
            moderationStatus: ContentModerationStatus.HIDDEN,
            hiddenAt: handledAt,
          },
        });
      }

      return report;
    });

    return { data };
  }
}
