import { TaskDifficulty, TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  instructions?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  coverImageUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24 * 60)
  estimatedMinutes?: number;

  @IsOptional()
  @IsEnum(TaskDifficulty)
  difficulty?: TaskDifficulty;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  budgetNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  requirements?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  alternatives?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reflectionPrompt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  sortOrder?: number;
}
