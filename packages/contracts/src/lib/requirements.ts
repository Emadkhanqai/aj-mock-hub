export const REQUIREMENT_DOCUMENT_MEDIA_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export type RequirementDocumentMediaType =
  (typeof REQUIREMENT_DOCUMENT_MEDIA_TYPES)[number];
export type RequirementDocumentStatus = 'UPLOADED' | 'EXTRACTED' | 'FAILED';
export type UiSpecificationStatus = 'DRAFT' | 'APPROVED';

export interface RequirementDocumentResponse {
  id: string;
  projectId: string;
  projectVersionId: string;
  originalName: string;
  mediaType: RequirementDocumentMediaType;
  byteSize: number;
  status: RequirementDocumentStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequirementDocumentListResponse {
  items: RequirementDocumentResponse[];
}

export interface UiSpecificationPage {
  id: string;
  name: string;
  route: string;
  purpose: string;
  components: string[];
  componentKinds?: Array<'CARD' | 'BUTTON'>;
  componentStyles?: Array<{
    textColor?: string | null;
    backgroundColor?: string | null;
  }>;
  dataNeeds: string[];
}

export interface UiSpecificationWorkflow {
  name: string;
  steps: string[];
}

export interface UiSpecificationNavigationItem {
  label: string;
  route: string;
}

export interface UiSpecificationContent {
  productSummary: string;
  audiences: string[];
  roles: string[];
  pages: UiSpecificationPage[];
  workflows: UiSpecificationWorkflow[];
  navigation: {
    pattern: 'SIDEBAR' | 'TOPBAR' | 'HYBRID';
    items: UiSpecificationNavigationItem[];
  };
  branding: {
    tone: string;
    primaryColor: string | null;
    accessibilityNotes: string[];
  };
  design?: {
    themePreset: 'AURORA' | 'MIDNIGHT' | 'PAPER' | 'SUNSET';
  };
  assumptions: string[];
  openQuestions: string[];
}

export interface UiSpecificationResponse {
  id: string;
  projectId: string;
  projectVersionId: string;
  status: UiSpecificationStatus;
  content: UiSpecificationContent;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUiSpecificationRequest {
  expectedUpdatedAt: string;
  content: UiSpecificationContent;
}

export interface ApproveUiSpecificationRequest {
  expectedUpdatedAt: string;
}
