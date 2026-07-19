import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import type { AcceptDraftRevisionRequest } from '@aj-mock-hub/contracts';

export class AcceptDraftRevisionDto implements AcceptDraftRevisionRequest {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;
}
