import { ReportReason } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateReportDto {
  @ValidateIf((dto: CreateReportDto) => !dto.taskId)
  @IsUUID()
  recordId?: string;

  @ValidateIf((dto: CreateReportDto) => !dto.recordId)
  @IsUUID()
  taskId?: string;

  @IsEnum(ReportReason)
  reason!: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;
}
