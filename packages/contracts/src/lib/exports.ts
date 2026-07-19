export interface DeveloperExportResponse {
  id: string;
  projectId: string;
  projectVersionId: string;
  fileName: string;
  contentHash: string;
  byteSize: number;
  fileCount: number;
  createdAt: string;
  downloadUrl: string;
  downloadExpiresAt: string;
  downloadCount: number;
}

export interface DeveloperExportListResponse {
  items: DeveloperExportResponse[];
}

export interface ShareDeveloperExportRequest {
  email: string;
}

export interface ShareDeveloperExportResponse {
  exportId: string;
  recipient: string;
  sentAt: string;
}
