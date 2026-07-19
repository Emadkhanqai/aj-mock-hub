import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import type { CopyProjectVersionRequest } from '@aj-mock-hub/contracts';

export class CopyProjectVersionDto implements CopyProjectVersionRequest {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;
}
