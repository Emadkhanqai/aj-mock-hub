import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProjectsApiService } from '../core/projects-api.service';

@Component({
  selector: 'app-new-project',
  imports: [ReactiveFormsModule, RouterLink],
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

    <form class="editor-form" [formGroup]="form" (ngSubmit)="submit()">
      <label>
        <span>Project name</span>
        <input formControlName="name" maxlength="120" autocomplete="off" />
        @if (form.controls.name.touched && form.controls.name.invalid) {
          <small>Name is required and must be 120 characters or fewer.</small>
        }
      </label>
      <label>
        <span>Description <em>optional</em></span>
        <textarea
          formControlName="description"
          maxlength="2000"
          rows="6"
        ></textarea>
      </label>
      @if (error()) {
        <p class="form-error" role="alert">
          The project could not be created. Please try again.
        </p>
      }
      <div class="form-actions">
        <a class="button secondary" routerLink="/projects">Cancel</a>
        <button
          class="button"
          type="submit"
          [disabled]="form.invalid || submitting()"
        >
          {{ submitting() ? 'Creating…' : 'Create project' }}
        </button>
      </div>
    </form>
  `,
})
export class NewProjectComponent {
  private readonly api = inject(ProjectsApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly submitting = signal(false);
  readonly error = signal(false);
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', Validators.maxLength(2000)],
  });

  submit() {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.error.set(false);
    const value = this.form.getRawValue();
    this.api
      .createProject({
        name: value.name.trim(),
        description: value.description.trim() || null,
      })
      .subscribe({
        next: (project) => void this.router.navigate(['/projects', project.id]),
        error: () => {
          this.error.set(true);
          this.submitting.set(false);
        },
      });
  }
}
