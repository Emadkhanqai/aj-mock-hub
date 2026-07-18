export type ProjectStatus = 'ACTIVE';
export type ProjectVersionStatus = 'DRAFT';
export type ProjectVersionSourceType = 'MANUAL';

export interface CreateProjectRequest {
  name: string;
  description?: string | null;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListResponse {
  items: ProjectResponse[];
}

export interface CreateProjectVersionRequest {
  label: string;
  instructionsSnapshot: string;
}

export interface ProjectVersionResponse {
  id: string;
  projectId: string;
  versionNumber: number;
  label: string;
  status: ProjectVersionStatus;
  sourceType: ProjectVersionSourceType;
  instructionsSnapshot: string;
  createdAt: string;
}

export interface ProjectVersionListResponse {
  items: ProjectVersionResponse[];
}
