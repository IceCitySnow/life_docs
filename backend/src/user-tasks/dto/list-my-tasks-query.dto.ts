import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

function toOptionalBoolean({ value }: { value: unknown }): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === true || value === 'true' || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === '0') {
    return false;
  }
  return value as boolean;
}

export class ListMyTasksQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  favorite?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  wished?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  started?: boolean;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  completed?: boolean;
}
