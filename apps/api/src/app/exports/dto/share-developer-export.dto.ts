import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import type { ShareDeveloperExportRequest } from '@aj-mock-hub/contracts';

export class ShareDeveloperExportDto implements ShareDeveloperExportRequest {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
