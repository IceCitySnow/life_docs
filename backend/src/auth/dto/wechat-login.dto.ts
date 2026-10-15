import { IsString, MaxLength, MinLength } from 'class-validator';

export class WechatLoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  code!: string;
}
