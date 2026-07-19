import { IsISO8601, IsObject } from 'class-validator';
import type { UpdateUiSpecificationRequest } from '@aj-mock-hub/contracts';

export class UpdateUiSpecificationDto implements UpdateUiSpecificationRequest {
  @IsISO8601({ strict: true })
  expectedUpdatedAt!: string;

  @IsObject()
  content!: UpdateUiSpecificationRequest['content'];
}
