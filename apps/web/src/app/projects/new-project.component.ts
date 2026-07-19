import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProjectsApiService } from '../core/projects-api.service';

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
            <h2>Project foundation</h2>
            <p>
              Name the durable workspace. You will capture requirements in its
              first immutable version.
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
        <label>
          <span
            >Description
            <em
              >optional · {{ form.controls.description.value.length }}/2000</em
            ></span
          >
          <textarea
            formControlName="description"
            maxlength="2000"
            rows="6"
            placeholder="What should this prototype help the team understand or validate?"
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
            {{ submitting() ? 'Creating workspace…' : 'Create project' }}
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
