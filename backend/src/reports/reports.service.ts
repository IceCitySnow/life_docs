import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentModerationStatus,
  RecordVisibility,
  TaskStatus,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reporterUserId: string, dto: CreateReportDto) {
    const hasRecord = Boolean(dto.recordId);
    const hasTask = Boolean(dto.taskId);
    if (hasRecord === hasTask) {
      throw new BadRequestException({
        code: 'INVALID_REPORT_TARGET',
        message: 'Provide exactly one of recordId or taskId.',
      });
    }

    if (dto.recordId) {
      const record = await this.prisma.explorationRecord.findFirst({
        where: {
          id: dto.recordId,
          visibility: RecordVisibility.PUBLIC,
          moderationStatus: ContentModerationStatus.VISIBLE,
          user: { status: UserStatus.ACTIVE },
        },
        select: { id: true },
      });
      if (!record) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Record not found.',
        });
      }
    }

    if (dto.taskId) {
      const task = await this.prisma.task.findFirst({
        where: { id: dto.taskId, status: TaskStatus.PUBLISHED },
        select: { id: true },
      });
      if (!task) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Task not found.',
        });
      }
    }

    const data = await this.prisma.report.create({
      data: {
        reporterUserId,
        recordId: dto.recordId,
        taskId: dto.taskId,
        reason: dto.reason,
        details: dto.details?.trim() || null,
      },
    });

    return { data };
  }
}
