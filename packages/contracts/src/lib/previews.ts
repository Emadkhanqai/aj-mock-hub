export type PreviewViewport = 'DESKTOP' | 'TABLET' | 'MOBILE';

export interface StaticPreviewResponse {
  id: string;
  projectId: string;
  projectVersionId: string;
  sourceJobId: string;
  entryUrl: string;
  contentHash: string;
  fileCount: number;
  totalBytes: number;
  publishedAt: string;
}

export interface PreviewElementSelection {
  id: string;
  type: string;
  file: string;
  pageId: string;
  label: string;
}

export interface PreviewElementMessage {
  type: 'ajmh:element-selected';
  element: PreviewElementSelection;
}
