import { Transform, Type } from 'class-transformer';
import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type {
  CreateDraftRevisionRequest,
  PreviewElementSelection,
} from '@aj-mock-hub/contracts';

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

class PreviewElementSelectionDto implements PreviewElementSelection {
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  @Matches(/^[a-zA-Z0-9:_-]+$/)
  id!: string;

  @Transform(trimmed)
  @IsString()
  @Matches(/^component$/)
  type!: string;

  @Transform(trimmed)
  @IsString()
  @Matches(/^src\/main\.ts$/)
  file!: string;

  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  pageId!: string;

  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  label!: string;
}

export class CreateDraftRevisionDto implements CreateDraftRevisionRequest {
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  instruction!: string;

  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  replacementText!: string;

  @ValidateNested()
  @Type(() => PreviewElementSelectionDto)
  target!: PreviewElementSelectionDto;
}
