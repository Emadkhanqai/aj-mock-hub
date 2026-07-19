import { IsISO8601 } from 'class-validator';
import type { ApproveUiSpecificationRequest } from '@aj-mock-hub/contracts';

export class ApproveUiSpecificationDto
  implements ApproveUiSpecificationRequest
{
  @IsISO8601({ strict: true })
  expectedUpdatedAt!: string;
}
