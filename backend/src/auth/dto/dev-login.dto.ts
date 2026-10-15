import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class DevLoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  wxOpenId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  displayName?: string;
}
