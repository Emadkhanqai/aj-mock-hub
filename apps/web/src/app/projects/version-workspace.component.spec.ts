import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProjectsApiService } from '../core/projects-api.service';
import {
  formatPipelineLog,
  VersionWorkspaceComponent,
} from './version-workspace.component';

describe('formatPipelineLog', () => {
  it('removes ANSI styling codes from persisted builder output', () => {
    expect(
      formatPipelineLog(
        `${String.fromCharCode(27)}[1m${String.fromCharCode(27)}[32m1 passed${String.fromCharCode(27)}[39m`,
      ),
    ).toBe('1 passed');
  });

  it('preserves ordinary diagnostic content', () => {
    expect(formatPipelineLog('build exited 0 in 6406ms')).toBe(
      'build exited 0 in 6406ms',
    );
  });
});

describe('VersionWorkspaceComponent automatic extraction', () => {
  const specification = {
    id: 'specification-1',
    projectId: 'project-1',
    projectVersionId: 'version-1',
    status: 'DRAFT' as const,
    content: {
      productSummary: 'A dashboard.',
      audiences: [],
      roles: [],
      pages: [
        {
          id: 'home',
          name: 'Home',
          route: '/',
          purpose: 'Show the dashboard.',
          components: ['Dashboard'],
          dataNeeds: [],
        },
      ],
      workflows: [],
      navigation: {
        pattern: 'TOPBAR' as const,
        items: [{ label: 'Home', route: '/' }],
      },
      branding: {
        tone: 'Professional',
        primaryColor: null,
        accessibilityNotes: [],
      },
      assumptions: [],
      openQuestions: ['Which navigation should be used?'],
    },
    approvedAt: null,
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
  };
  const api = {
    getProject: vi.fn(() =>
      of({
        id: 'project-1',
        name: 'Portal',
        description: null,
        status: 'ACTIVE',
        createdAt: '2026-07-20T00:00:00.000Z',
        updatedAt: '2026-07-20T00:00:00.000Z',
      }),
    ),
    getVersion: vi.fn(() =>
      of({
        id: 'version-1',
        projectId: 'project-1',
        versionNumber: 1,
        label: 'Initial',
        status: 'DRAFT',
        sourceType: 'MANUAL',
        instructionsSnapshot: 'Create a dashboard.',
        createdAt: '2026-07-20T00:00:00.000Z',
      }),
    ),
    listDocuments: vi.fn(() => of({ items: [] })),
    getSpecification: vi.fn(() => throwError(() => new Error('Not found'))),
    getPreview: vi.fn(() => throwError(() => new Error('Not found'))),
    listExports: vi.fn(() => of({ items: [] })),
    listPipelineJobs: vi.fn(() => of({ items: [] })),
    extractSpecification: vi.fn(() => of(specification)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [VersionWorkspaceComponent],
      providers: [
        provideRouter([]),
        { provide: ProjectsApiService, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (name: string) =>
                  name === 'projectId' ? 'project-1' : 'version-1',
              },
              queryParamMap: {
                get: (name: string) => (name === 'autoExtract' ? 'true' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('starts extraction immediately and blocks approval for open questions', () => {
    const fixture = TestBed.createComponent(VersionWorkspaceComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(api.extractSpecification).toHaveBeenCalledWith(
      'project-1',
      'version-1',
    );
    expect(component.hasOpenQuestions()).toBe(true);
    expect(component.editing()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      '1-page Angular prototype with 1 navigation item.',
    );
    expect(fixture.nativeElement.textContent).toContain('Top navigation bar');
    expect(fixture.nativeElement.textContent).toContain('Re-read source files');
    expect(fixture.nativeElement.querySelector('.page-plan-grid')).toBeNull();
  });
});
