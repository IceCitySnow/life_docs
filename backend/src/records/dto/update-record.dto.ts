import { RecordVisibility } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateRecordDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  titleSnapshot?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  reflectionText?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  photoRefs?: string[];

  @IsOptional()
  @IsEnum(RecordVisibility)
  visibility?: RecordVisibility;
}
