import { ReportStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListReportsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}
