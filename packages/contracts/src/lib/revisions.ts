import type { PreviewElementSelection } from './previews';
import type { ProjectVersionResponse } from './projects';

export type DraftRevisionStatus =
  | 'VALIDATING'
  | 'READY'
  | 'ACCEPTED'
  | 'DISCARDED'
  | 'FAILED';

export type VisualRevisionOperation =
  | 'RENAME'
  | 'RECOLOR'
  | 'CLONE'
  | 'ADD_BUTTON'
  | 'THEME';

export type VisualThemePreset = 'AURORA' | 'MIDNIGHT' | 'PAPER' | 'SUNSET';

export interface CreateDraftRevisionRequest {
  instruction: string;
  replacementText: string;
  target: PreviewElementSelection;
  operation?: VisualRevisionOperation;
  textColor?: string | null;
  backgroundColor?: string | null;
  buttonLabel?: string | null;
  themePreset?: VisualThemePreset | null;
}

export interface AcceptDraftRevisionRequest {
  label: string;
}

export interface DraftRevisionResponse {
  id: string;
  projectId: string;
  baseProjectVersionId: string;
  acceptedProjectVersionId: string | null;
  pipelineJobId: string;
  status: DraftRevisionStatus;
  instruction: string;
  replacementText: string;
  operation: VisualRevisionOperation;
  textColor: string | null;
  backgroundColor: string | null;
  buttonLabel: string | null;
  themePreset: VisualThemePreset | null;
  target: PreviewElementSelection;
  previewEntryUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DraftRevisionListResponse {
  items: DraftRevisionResponse[];
}

export interface AcceptDraftRevisionResponse {
  revision: DraftRevisionResponse;
  version: ProjectVersionResponse;
}
