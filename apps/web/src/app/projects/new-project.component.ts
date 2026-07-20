import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProjectsApiService } from '../core/projects-api.service';
import { forkJoin, map, of, switchMap } from 'rxjs';

const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ATTACHMENT_MEDIA_TYPES: Record<string, string> = {
  txt: 'text/plain',
  md: 'text/markdown',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

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
      @if (submitting()) {
        <section class="editor-form setup-progress" aria-live="polite">
          <span class="setup-orbit" aria-hidden="true"
            ><i></i><i></i><i></i
          ></span>
          <p class="eyebrow">Creating version 1</p>
          <h2>{{ setupStep() }}</h2>
          <p>
            Keep this page open. Your sources are being secured before the UI
            plan is prepared.
          </p>
        </section>
      } @else {
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
              <small
                >Name is required and must be 120 characters or fewer.</small
              >
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
          <section class="attachment-field" aria-labelledby="attachment-title">
            <div class="attachment-heading">
              <div>
                <strong id="attachment-title">Add source files</strong>
                <p>
                  Attach briefs, documents or reference screenshots. These files
                  will be treated as the source of truth.
                </p>
              </div>
              <span>{{ attachments().length }}/10</span>
            </div>
            <label class="attachment-picker">
              <input
                type="file"
                multiple
                aria-label="Choose source files"
                accept=".txt,.md,.pdf,.docx,.png,.jpg,.jpeg,.webp"
                (change)="selectAttachments($event)"
              />
              <span>＋ Choose files</span>
              <small>TXT, MD, PDF, DOCX, PNG, JPG or WebP · 10 MB each</small>
            </label>
            @if (attachmentError()) {
              <p class="attachment-error" role="alert">
                {{ attachmentError() }}
              </p>
            }
            @if (attachments().length) {
              <ul class="attachment-list">
                @for (file of attachments(); track file) {
                  <li>
                    <span class="attachment-type">{{
                      extension(file.name)
                    }}</span>
                    <span>
                      <strong>{{ file.name }}</strong>
                      <small>{{ formatBytes(file.size) }}</small>
                    </span>
                    <button
                      type="button"
                      [attr.aria-label]="'Remove ' + file.name"
                      (click)="removeAttachment(file)"
                    >
                      Remove
                    </button>
                  </li>
                }
              </ul>
            }
          </section>
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
              Create project
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class NewProjectComponent {
  private readonly api = inject(ProjectsApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly submitting = signal(false);
  readonly error = signal(false);
  readonly attachmentError = signal('');
  readonly attachments = signal<File[]>([]);
  readonly setupStep = signal('Saving your project…');
  private createdProjectId: string | null = null;
  private createdVersionId: string | null = null;
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

  selectAttachments(event: Event) {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    input.value = '';
    if (!selected.length) return;
    const combined = [...this.attachments(), ...selected];
    if (combined.length > MAX_ATTACHMENTS) {
      this.attachmentError.set('You can attach up to 10 files.');
      return;
    }
    const normalized: File[] = [];
    for (const file of combined) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      const mediaType = ATTACHMENT_MEDIA_TYPES[extension];
      if (!mediaType) {
        this.attachmentError.set(
          `${file.name} is not supported. Choose TXT, MD, PDF, DOCX, PNG, JPG or WebP.`,
        );
        return;
      }
      if (file.size < 1 || file.size > MAX_ATTACHMENT_BYTES) {
        this.attachmentError.set(
          `${file.name} must be between 1 byte and 10 MB.`,
        );
        return;
      }
      normalized.push(
        file.type === mediaType
          ? file
          : new File([file], file.name, { type: mediaType }),
      );
    }
    this.attachments.set(normalized);
    this.attachmentError.set('');
  }

  removeAttachment(file: File) {
    this.attachments.update((items) => items.filter((item) => item !== file));
    this.attachmentError.set('');
  }

  extension(name: string) {
    return name.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE';
  }

  formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  submit() {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.error.set(false);
    this.setupStep.set('Saving your project…');
    this.createdProjectId = null;
    this.createdVersionId = null;
    const value = this.form.getRawValue();
    this.api
      .createProject({
        name: value.name.trim(),
      })
      .pipe(
        switchMap((project) => {
          this.createdProjectId = project.id;
          this.setupStep.set('Creating immutable version 1…');
          return this.api
            .createVersion(project.id, {
              label: `${value.preset.toLowerCase()} starter`,
              instructionsSnapshot: `${value.instructions.trim()}\n\nStarting style: ${value.preset}.`,
            })
            .pipe(
              map((version) => {
                this.createdVersionId = version.id;
                return { project, version };
              }),
            );
        }),
        switchMap(({ project, version }) => {
          const files = this.attachments();
          this.setupStep.set(
            files.length
              ? `Securing ${files.length} source ${files.length === 1 ? 'file' : 'files'}…`
              : 'Preparing automatic requirements extraction…',
          );
          const uploads = files.length
            ? forkJoin(
                files.map((file) =>
                  this.api.uploadDocument(project.id, version.id, file),
                ),
              )
            : of([]);
          return uploads.pipe(map(() => ({ project, version })));
        }),
      )
      .subscribe({
        next: ({ project, version }) => {
          this.setupStep.set('Opening automatic extraction…');
          void this.router.navigate(
            ['/projects', project.id, 'versions', version.id],
            { queryParams: { autoExtract: 'true' } },
          );
        },
        error: () => {
          this.error.set(true);
          this.submitting.set(false);
          if (this.createdProjectId && this.createdVersionId) {
            void this.router.navigate(
              [
                '/projects',
                this.createdProjectId,
                'versions',
                this.createdVersionId,
              ],
              { queryParams: { setupError: 'upload' } },
            );
          } else if (this.createdProjectId) {
            void this.router.navigate(['/projects', this.createdProjectId]);
          }
        },
      });
  }
}
