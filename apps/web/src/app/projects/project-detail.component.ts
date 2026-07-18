import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ProjectResponse,
  ProjectVersionResponse,
} from '@aj-mock-hub/contracts';
import { forkJoin } from 'rxjs';
import { ProjectsApiService } from '../core/projects-api.service';

@Component({
  selector: 'app-project-detail',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  template: `
    <a class="back-link" routerLink="/projects">← Projects</a>
    @if (loading()) {
      <section class="state">Loading project…</section>
    } @else if (error() || !project()) {
      <section class="state error" role="alert">
        <h1>Project unavailable</h1>
        <p>The project may not exist, or the API is unavailable.</p>
      </section>
    } @else {
      <header class="detail-header">
        <div>
          <p class="eyebrow">Project · {{ project()!.status }}</p>
          <h1>{{ project()!.name }}</h1>
          <p class="lede">
            {{ project()!.description || 'No description provided.' }}
          </p>
        </div>
        <button
          class="button"
          type="button"
          (click)="showVersionForm.set(!showVersionForm())"
        >
          {{ showVersionForm() ? 'Close editor' : 'Create version' }}
        </button>
      </header>

      @if (showVersionForm()) {
        <form
          class="editor-form version-form"
          [formGroup]="versionForm"
          (ngSubmit)="createVersion()"
        >
          <div class="form-heading">
            <span class="version-number">{{
              nextVersionNumber().toString().padStart(2, '0')
            }}</span>
            <div>
              <h2>Capture a new revision</h2>
              <p>Once created, this snapshot cannot be edited or deleted.</p>
            </div>
          </div>
          <label
            ><span>Version label</span
            ><input formControlName="label" maxlength="120"
          /></label>
          <label
            ><span
              >Instructions snapshot
              <em
                >Describe the pages, workflows, data and visual direction.</em
              ></span
            ><textarea
              formControlName="instructionsSnapshot"
              maxlength="20000"
              rows="8"
              placeholder="Example: Create a responsive e-budgeting dashboard with budget overview, department allocations, expense tracking, approval workflow, charts, searchable tables, accessible forms and realistic mock data."
            ></textarea>
          </label>
          @if (versionError()) {
            <p class="form-error" role="alert">
              The version could not be created.
            </p>
          }
          <div class="form-actions">
            <button
              class="button"
              type="submit"
              [disabled]="versionForm.invalid || savingVersion()"
            >
              {{ savingVersion() ? 'Saving…' : 'Create immutable version' }}
            </button>
          </div>
        </form>
      }

      <section class="history">
        <div class="section-heading">
          <p class="eyebrow">Version history</p>
          <h2>
            {{ versions().length }} preserved revision{{
              versions().length === 1 ? '' : 's'
            }}
          </h2>
        </div>
        @if (versions().length === 0) {
          <div class="state empty">
            <h3>No versions yet</h3>
            <p>Create version 1 to preserve the first instruction snapshot.</p>
          </div>
        } @else {
          <ol class="version-list">
            @for (version of versions(); track version.id) {
              <li>
                <div class="version-number">
                  {{ version.versionNumber.toString().padStart(2, '0') }}
                </div>
                <div class="version-content">
                  <h3>{{ version.label }}</h3>
                  <p>{{ version.instructionsSnapshot }}</p>
                </div>
                <div class="version-meta">
                  <span>{{ version.status }}</span
                  ><time [dateTime]="version.createdAt">{{
                    version.createdAt | date: 'medium'
                  }}</time
                  ><small>Immutable</small>
                </div>
              </li>
            }
          </ol>
        }
      </section>
    }
  `,
})
export class ProjectDetailComponent implements OnInit {
  private readonly api = inject(ProjectsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly project = signal<ProjectResponse | null>(null);
  readonly versions = signal<ProjectVersionResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly showVersionForm = signal(false);
  readonly savingVersion = signal(false);
  readonly versionError = signal(false);
  readonly versionForm = this.fb.nonNullable.group({
    label: ['', [Validators.required, Validators.maxLength(120)]],
    instructionsSnapshot: [
      '',
      [Validators.required, Validators.maxLength(20000)],
    ],
  });

  nextVersionNumber() {
    return (
      this.versions().reduce(
        (highest, version) => Math.max(highest, version.versionNumber),
        0,
      ) + 1
    );
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('projectId');
    if (!id) {
      this.loading.set(false);
      this.error.set(true);
      return;
    }
    forkJoin({
      project: this.api.getProject(id),
      versions: this.api.listVersions(id),
    }).subscribe({
      next: ({ project, versions }) => {
        this.project.set(project);
        this.versions.set(versions.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  createVersion() {
    const project = this.project();
    if (!project || this.versionForm.invalid || this.savingVersion()) return;
    this.savingVersion.set(true);
    this.versionError.set(false);
    const value = this.versionForm.getRawValue();
    this.api
      .createVersion(project.id, {
        label: value.label.trim(),
        instructionsSnapshot: value.instructionsSnapshot.trim(),
      })
      .subscribe({
        next: (version) => {
          this.versions.update((items) => [...items, version]);
          this.versionForm.reset();
          this.showVersionForm.set(false);
          this.savingVersion.set(false);
        },
        error: () => {
          this.versionError.set(true);
          this.savingVersion.set(false);
        },
      });
  }
}
