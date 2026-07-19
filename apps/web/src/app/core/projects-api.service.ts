import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  CreatePipelineJobResponse,
  CreateProjectRequest,
  CreateProjectVersionRequest,
  ProjectListResponse,
  ProjectResponse,
  ProjectVersionListResponse,
  ProjectVersionResponse,
  RequirementDocumentListResponse,
  RequirementDocumentResponse,
  UiSpecificationResponse,
  UpdateUiSpecificationRequest,
} from '@aj-mock-hub/contracts';

@Injectable({ providedIn: 'root' })
export class ProjectsApiService {
  private readonly http = inject(HttpClient);

  listProjects() {
    return this.http.get<ProjectListResponse>('/api/projects');
  }

  getProject(projectId: string) {
    return this.http.get<ProjectResponse>(`/api/projects/${projectId}`);
  }

  createProject(request: CreateProjectRequest) {
    return this.http.post<ProjectResponse>('/api/projects', request);
  }

  listVersions(projectId: string) {
    return this.http.get<ProjectVersionListResponse>(
      `/api/projects/${projectId}/versions`,
    );
  }

  createVersion(projectId: string, request: CreateProjectVersionRequest) {
    return this.http.post<ProjectVersionResponse>(
      `/api/projects/${projectId}/versions`,
      request,
    );
  }

  getVersion(projectId: string, versionId: string) {
    return this.http.get<ProjectVersionResponse>(
      `/api/projects/${projectId}/versions/${versionId}`,
    );
  }

  listDocuments(projectId: string, versionId: string) {
    return this.http.get<RequirementDocumentListResponse>(
      `/api/projects/${projectId}/versions/${versionId}/documents`,
    );
  }

  uploadDocument(projectId: string, versionId: string, file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<RequirementDocumentResponse>(
      `/api/projects/${projectId}/versions/${versionId}/documents`,
      body,
    );
  }

  extractSpecification(projectId: string, versionId: string) {
    return this.http.post<UiSpecificationResponse>(
      `/api/projects/${projectId}/versions/${versionId}/ui-specification/extract`,
      {},
    );
  }

  getSpecification(projectId: string, versionId: string) {
    return this.http.get<UiSpecificationResponse>(
      `/api/projects/${projectId}/versions/${versionId}/ui-specification`,
    );
  }

  updateSpecification(
    projectId: string,
    versionId: string,
    request: UpdateUiSpecificationRequest,
  ) {
    return this.http.put<UiSpecificationResponse>(
      `/api/projects/${projectId}/versions/${versionId}/ui-specification`,
      request,
    );
  }

  approveSpecification(
    projectId: string,
    versionId: string,
    expectedUpdatedAt: string,
  ) {
    return this.http.post<UiSpecificationResponse>(
      `/api/projects/${projectId}/versions/${versionId}/ui-specification/approve`,
      { expectedUpdatedAt },
    );
  }

  generateAngularProject(
    projectId: string,
    versionId: string,
    idempotencyKey: string,
  ) {
    return this.http.post<CreatePipelineJobResponse>(
      `/api/projects/${projectId}/versions/${versionId}/generation-jobs`,
      { idempotencyKey },
    );
  }
}
