import type { UiSpecificationContent } from '@aj-mock-hub/contracts';
import type { PrismaService } from '@aj-mock-hub/database';
import { PipelineWorkerService } from './pipeline-worker.service';

type RevisionInput = {
  targetPageId: string;
  targetElementId: string;
  targetElementType: string;
  targetFile: string;
  replacementText: string;
  operation: string;
  textColor: string | null;
  backgroundColor: string | null;
  buttonLabel: string | null;
  themePreset: string | null;
};

const source: UiSpecificationContent = {
  productSummary: 'Synthetic portal',
  audiences: [],
  roles: [],
  pages: [
    {
      id: 'home',
      name: 'Home',
      route: '/',
      purpose: 'Show activity.',
      components: ['Overview'],
      dataNeeds: [],
    },
  ],
  workflows: [],
  navigation: {
    pattern: 'SIDEBAR',
    items: [{ label: 'Home', route: '/' }],
  },
  branding: {
    tone: 'Professional',
    primaryColor: null,
    accessibilityNotes: [],
  },
  assumptions: [],
  openQuestions: [],
};

describe('visual revision operations', () => {
  const service = new PipelineWorkerService({} as PrismaService);
  const apply = (changes: Partial<RevisionInput>): UiSpecificationContent =>
    (
      service as unknown as {
        applyTargetedRevision(
          input: UiSpecificationContent,
          revision: RevisionInput,
        ): UiSpecificationContent;
      }
    ).applyTargetedRevision(source, {
      targetPageId: 'home',
      targetElementId: 'home:component:0',
      targetElementType: 'component',
      targetFile: 'src/main.ts',
      replacementText: 'Overview',
      operation: 'RENAME',
      textColor: null,
      backgroundColor: null,
      buttonLabel: null,
      themePreset: null,
      ...changes,
    });

  it('applies bounded element colors', () => {
    const result = apply({
      operation: 'RECOLOR',
      textColor: '#ffffff',
      backgroundColor: '#112233',
    });
    expect(result.pages[0]?.componentStyles?.[0]).toEqual({
      textColor: '#ffffff',
      backgroundColor: '#112233',
    });
  });

  it('duplicates items and adds real buttons without changing the base input', () => {
    const cloned = apply({ operation: 'CLONE' });
    const withButton = apply({
      operation: 'ADD_BUTTON',
      buttonLabel: 'Open report',
    });
    expect(cloned.pages[0]?.components).toEqual(['Overview', 'Overview']);
    expect(withButton.pages[0]?.components).toEqual([
      'Overview',
      'Open report',
    ]);
    expect(withButton.pages[0]?.componentKinds).toEqual(['CARD', 'BUTTON']);
    expect(source.pages[0]?.components).toEqual(['Overview']);
  });

  it('applies an allowlisted page theme', () => {
    const result = apply({ operation: 'THEME', themePreset: 'SUNSET' });
    expect(result.design?.themePreset).toBe('SUNSET');
    expect(result.branding.primaryColor).toBe('#ff8c69');
  });
});
