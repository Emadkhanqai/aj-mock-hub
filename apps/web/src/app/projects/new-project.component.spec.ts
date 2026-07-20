import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProjectsApiService } from '../core/projects-api.service';
import { NewProjectComponent } from './new-project.component';

describe('NewProjectComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewProjectComponent],
      providers: [
        provideRouter([]),
        { provide: ProjectsApiService, useValue: {} },
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
  });

  it('accepts up to 10,000 instruction characters and rejects more', () => {
    const fixture = TestBed.createComponent(NewProjectComponent);
    const instructions = fixture.componentInstance.form.controls.instructions;

    instructions.setValue('a'.repeat(10_000));
    expect(instructions.valid).toBe(true);

    instructions.setValue('a'.repeat(10_001));
    expect(instructions.hasError('maxlength')).toBe(true);
  });
});
