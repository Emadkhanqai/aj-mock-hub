import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { ProjectsApiService } from '../core/projects-api.service';
import { NewProjectComponent } from './new-project.component';

describe('NewProjectComponent', () => {
  const api = {
    createProject: vi.fn(),
    createVersion: vi.fn(),
    uploadDocument: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [NewProjectComponent],
      providers: [
        provideRouter([]),
        { provide: ProjectsApiService, useValue: api },
      ],
    }).compileComponents();
  });

  it('keeps onboarding focused on the project name, style, and app brief', () => {
    const fixture = TestBed.createComponent(NewProjectComponent);
    fixture.detectChanges();
    const view = fixture.nativeElement as HTMLElement;

    expect(view.textContent).not.toContain('Description');
    expect(view.querySelectorAll('textarea')).toHaveLength(1);
    expect(view.querySelector('textarea')?.getAttribute('maxlength')).toBe(
      '10000',
    );
    expect(view.textContent).not.toContain('A clean path from brief to build.');
    expect(
      view.querySelector('input[type="file"]')?.getAttribute('multiple'),
    ).not.toBeNull();
  });

  it('accepts up to 10,000 instruction characters and rejects more', () => {
    const fixture = TestBed.createComponent(NewProjectComponent);
    const instructions = fixture.componentInstance.form.controls.instructions;

    instructions.setValue('a'.repeat(10_000));
    expect(instructions.valid).toBe(true);

    instructions.setValue('a'.repeat(10_001));
    expect(instructions.hasError('maxlength')).toBe(true);
  });

  it('accepts supported image sources and rejects more than 10 files', () => {
    const fixture = TestBed.createComponent(NewProjectComponent);
    const component = fixture.componentInstance;
    const image = new File(['image'], 'dashboard.png', { type: 'image/png' });

    component.selectAttachments({
      target: { files: [image], value: 'selected' },
    } as unknown as Event);
    expect(component.attachments()).toEqual([image]);

    const tooMany = Array.from(
      { length: 10 },
      (_, index) =>
        new File(['brief'], `brief-${index}.md`, { type: 'text/markdown' }),
    );
    component.selectAttachments({
      target: { files: tooMany, value: 'selected' },
    } as unknown as Event);
    expect(component.attachmentError()).toBe('You can attach up to 10 files.');
    expect(component.attachments()).toEqual([image]);
  });

  it('creates version 1, uploads sources, and opens automatic extraction', () => {
    const fixture = TestBed.createComponent(NewProjectComponent);
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const file = new File(['# Brief'], 'brief.md', {
      type: 'text/markdown',
    });
    api.createProject.mockReturnValue(
      of({ id: 'project-1', name: 'Portal', description: null }),
    );
    api.createVersion.mockReturnValue(of({ id: 'version-1' }));
    api.uploadDocument.mockReturnValue(of({ id: 'document-1' }));
    component.form.setValue({
      name: 'Portal',
      preset: 'AURORA',
      instructions: 'Create a dashboard.',
    });
    component.attachments.set([file]);

    component.submit();

    expect(api.uploadDocument).toHaveBeenCalledWith(
      'project-1',
      'version-1',
      file,
    );
    expect(navigate).toHaveBeenCalledWith(
      ['/projects', 'project-1', 'versions', 'version-1'],
      { queryParams: { autoExtract: 'true' } },
    );
  });
});
