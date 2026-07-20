import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProjectsApiService } from '../core/projects-api.service';
import { map, switchMap } from 'rxjs';

@Component({
  selector: 'app-new-project',
  imports: [ReactiveFormsModule, RouterLink],
  styleUrl: './new-project.component.scss',
  template: `
    <a class="back-link" routerLink="/projects">← Projects</a>
    <header class="page-header compact">
      <div>
        <p class="eyebrow">New project</p>
        <h1>Define the idea.</h1>
        <p class="lede">
          Create the durable project record before capturing its first version.
        </p>
      </div>
    </header>

    <div class="project-creation-layout">
      <form
        class="editor-form creation-form"
        [formGroup]="form"
        (ngSubmit)="submit()"
      >
        <div class="form-intro">
          <span>01</span>
          <div>
            <h2>Start your project</h2>
            <p>
              Add the essentials now. You can refine the generated app later.
            </p>
          </div>
        </div>
        <label>
          <span
            >Project name
            <em>{{ form.controls.name.value.length }}/120</em></span
          >
          <input
            formControlName="name"
            maxlength="120"
            autocomplete="off"
            placeholder="e.g. Customer service portal"
          />
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <small>Name is required and must be 120 characters or fewer.</small>
          }
        </label>
        <fieldset class="preset-fieldset">
          <legend>Choose a starting style</legend>
          <p>You can change colors later in the visual editor.</p>
          <div class="preset-grid">
            @for (preset of presets; track preset.value) {
              <button
                type="button"
                [class.selected]="form.controls.preset.value === preset.value"
                (click)="form.controls.preset.setValue(preset.value)"
              >
                <i [style.--preset-color]="preset.color"></i>
                <strong>{{ preset.label }}</strong>
                <small>{{ preset.description }}</small>
              </button>
            }
          </div>
        </fieldset>
        <label>
          <span
            >What should the app do?
            <em
              >{{ form.controls.instructions.value.length }} / 10,000</em
            ></span
          >
          <textarea
            formControlName="instructions"
            maxlength="10000"
            rows="6"
            placeholder="Example: Create a customer portal with a dashboard, requests table, status filters and a simple approval flow."
          ></textarea>
          @if (
            form.controls.instructions.touched &&
            form.controls.instructions.invalid
          ) {
            <small
              >Tell us what you want to build in 10,000 characters or
              fewer.</small
            >
          }
        </label>
        @if (error()) {
          <p class="form-error" role="alert">
            We could not finish setting up the project. Please try again.
          </p>
        }
        <div class="form-actions">
          <a class="button secondary" routerLink="/projects">Cancel</a>
          <button
            class="button"
            type="submit"
            [disabled]="form.invalid || submitting()"
          >
            {{ submitting() ? 'Setting up…' : 'Create project' }}
          </button>
        </div>
      </form>
      <aside class="creation-guide" aria-label="What happens next">
        <span class="panel-index">Next</span>
        <h2>A clean path from brief to build.</h2>
        <ol>
          <li>
            <span>01</span>
            <div>
              <strong>Capture requirements</strong>
              <p>Write the brief and attach supporting documents.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Review the UI plan</strong>
              <p>Correct the extracted pages, workflows and assumptions.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Generate safely</strong>
              <p>Validate Angular output inside an isolated container.</p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <strong>Preview and hand off</strong>
              <p>Revise, preserve and export clean source.</p>
            </div>
          </li>
        </ol>
        <p class="guide-note">
          Nothing is generated until you approve the specification.
        </p>
      </aside>
    </div>
  `,
})
export class NewProjectComponent {
  private readonly api = inject(ProjectsApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly submitting = signal(false);
  readonly error = signal(false);
  private createdProjectId: string | null = null;
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    preset: ['AURORA'],
    instructions: ['', [Validators.required, Validators.maxLength(10000)]],
  });
  readonly presets = [
    {
      value: 'AURORA',
      label: 'Aurora',
      description: 'Fresh green, dark and modern',
      color: '#7cf6c3',
    },
    {
      value: 'MIDNIGHT',
      label: 'Midnight',
      description: 'Deep blue for data-heavy apps',
      color: '#8fa7ff',
    },
    {
      value: 'PAPER',
      label: 'Paper',
      description: 'Bright, clean and professional',
      color: '#e8e4d8',
    },
    {
      value: 'SUNSET',
      label: 'Sunset',
      description: 'Warm and bold for campaigns',
      color: '#ff8c69',
    },
  ] as const;

  submit() {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.error.set(false);
    this.createdProjectId = null;
    const value = this.form.getRawValue();
    this.api
      .createProject({
        name: value.name.trim(),
      })
      .pipe(
        switchMap((project) => {
          this.createdProjectId = project.id;
          return this.api
            .createVersion(project.id, {
              label: `${value.preset.toLowerCase()} starter`,
              instructionsSnapshot: `${value.instructions.trim()}\n\nStarting style: ${value.preset}.`,
            })
            .pipe(map((version) => ({ project, version })));
        }),
      )
      .subscribe({
        next: ({ project, version }) =>
          void this.router.navigate([
            '/projects',
            project.id,
            'versions',
            version.id,
          ]),
        error: () => {
          this.error.set(true);
          this.submitting.set(false);
          if (this.createdProjectId) {
            void this.router.navigate(['/projects', this.createdProjectId]);
          }
        },
      });
  }
}
