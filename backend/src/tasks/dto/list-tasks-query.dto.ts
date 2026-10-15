import { TaskDifficulty } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListTasksQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tag?: string;

  @IsOptional()
  @IsEnum(TaskDifficulty)
  difficulty?: TaskDifficulty;
}
