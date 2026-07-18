export type PipelineJobType = 'WORKSPACE_PREPARATION' | 'ISOLATED_BUILD';
export type PipelineJobStatus =
  | 'QUEUED'
  | 'ACTIVE'
  | 'RETRYING'
  | 'CANCEL_REQUESTED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'FAILED';
export type PipelineJobLogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface CreatePipelineJobRequest {
  idempotencyKey: string;
}

export interface PipelineJobLogResponse {
  id: string;
  sequence: number;
  level: PipelineJobLogLevel;
  message: string;
  createdAt: string;
}

export interface PipelineJobResponse {
  id: string;
  projectId: string;
  projectVersionId: string;
  type: PipelineJobType;
  status: PipelineJobStatus;
  attempts: number;
  maxAttempts: number;
  cancellationRequestedAt: string | null;
  cancelledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePipelineJobResponse {
  job: PipelineJobResponse;
  reused: boolean;
}

export interface PipelineJobDetailResponse extends PipelineJobResponse {
  logs: PipelineJobLogResponse[];
}

export interface PipelineJobListResponse {
  items: PipelineJobResponse[];
}
