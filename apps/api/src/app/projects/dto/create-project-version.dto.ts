import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import type { CreateProjectVersionRequest } from '@aj-mock-hub/contracts';

export class CreateProjectVersionDto implements CreateProjectVersionRequest {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @IsString()
  @Matches(/\S/, { message: 'instructionsSnapshot must not be blank' })
  @MaxLength(50000)
  instructionsSnapshot!: string;
}
