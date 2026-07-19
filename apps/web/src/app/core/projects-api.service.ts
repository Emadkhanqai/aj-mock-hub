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
  StaticPreviewResponse,
  AcceptDraftRevisionResponse,
  CreateDraftRevisionRequest,
  DraftRevisionListResponse,
  DraftRevisionResponse,
  ProjectVersionComparisonResponse,
  PipelineJobDetailResponse,
  UiSpecificationResponse,
  UpdateUiSpecificationRequest,
  DeveloperExportListResponse,
  DeveloperExportResponse,
  ShareDeveloperExportResponse,
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

  getPipelineJob(projectId: string, jobId: string) {
    return this.http.get<PipelineJobDetailResponse>(
      `/api/projects/${projectId}/jobs/${jobId}`,
    );
  }

  getPreview(projectId: string, versionId: string) {
    return this.http.get<StaticPreviewResponse>(
      `/api/projects/${projectId}/versions/${versionId}/preview`,
    );
  }

  createRevision(
    projectId: string,
    versionId: string,
    request: CreateDraftRevisionRequest,
  ) {
    return this.http.post<DraftRevisionResponse>(
      `/api/projects/${projectId}/versions/${versionId}/revisions`,
      request,
    );
  }

  listRevisions(projectId: string, versionId: string) {
    return this.http.get<DraftRevisionListResponse>(
      `/api/projects/${projectId}/versions/${versionId}/revisions`,
    );
  }

  getRevision(projectId: string, revisionId: string) {
    return this.http.get<DraftRevisionResponse>(
      `/api/projects/${projectId}/revisions/${revisionId}`,
    );
  }

  discardRevision(projectId: string, revisionId: string) {
    return this.http.post<DraftRevisionResponse>(
      `/api/projects/${projectId}/revisions/${revisionId}/discard`,
      {},
    );
  }

  acceptRevision(projectId: string, revisionId: string, label: string) {
    return this.http.post<AcceptDraftRevisionResponse>(
      `/api/projects/${projectId}/revisions/${revisionId}/accept`,
      { label },
    );
  }

  duplicateVersion(projectId: string, versionId: string, label: string) {
    return this.http.post<ProjectVersionResponse>(
      `/api/projects/${projectId}/versions/${versionId}/duplicate`,
      { label },
    );
  }

  restoreVersion(projectId: string, versionId: string, label: string) {
    return this.http.post<ProjectVersionResponse>(
      `/api/projects/${projectId}/versions/${versionId}/restore`,
      { label },
    );
  }

  compareVersions(projectId: string, leftId: string, rightId: string) {
    return this.http.get<ProjectVersionComparisonResponse>(
      `/api/projects/${projectId}/versions/${leftId}/compare/${rightId}`,
    );
  }

  listExports(projectId: string, versionId: string) {
    return this.http.get<DeveloperExportListResponse>(
      `/api/projects/${projectId}/versions/${versionId}/exports`,
    );
  }

  createExport(projectId: string, versionId: string) {
    return this.http.post<DeveloperExportResponse>(
      `/api/projects/${projectId}/versions/${versionId}/exports`,
      {},
    );
  }

  shareExport(projectId: string, exportId: string, email: string) {
    return this.http.post<ShareDeveloperExportResponse>(
      `/api/projects/${projectId}/exports/${exportId}/share`,
      { email },
    );
  }
}
