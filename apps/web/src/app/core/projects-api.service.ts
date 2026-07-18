import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  CreateProjectRequest,
  CreateProjectVersionRequest,
  ProjectListResponse,
  ProjectResponse,
  ProjectVersionListResponse,
  ProjectVersionResponse,
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
}
