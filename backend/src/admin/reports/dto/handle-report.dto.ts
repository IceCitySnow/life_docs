import { ReportStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class HandleReportDto {
  @IsEnum(ReportStatus)
  status!: ReportStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNote?: string;

  /** When true and target is a record, hide it from public feeds. */
  @IsOptional()
  @IsBoolean()
  hideContent?: boolean;
}
