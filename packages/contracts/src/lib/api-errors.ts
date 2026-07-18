export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'PROJECT_NOT_FOUND'
  | 'PROJECT_VERSION_NOT_FOUND'
  | 'VERSION_CREATION_CONFLICT'
  | 'PIPELINE_JOB_NOT_FOUND'
  | 'PIPELINE_JOB_NOT_CANCELLABLE'
  | 'QUEUE_UNAVAILABLE'
  | 'DATABASE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
}
