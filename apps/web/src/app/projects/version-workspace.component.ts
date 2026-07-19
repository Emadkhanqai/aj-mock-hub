import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type {
  ProjectResponse,
  ProjectVersionResponse,
  RequirementDocumentResponse,
  StaticPreviewResponse,
  UiSpecificationResponse,
  DeveloperExportResponse,
  PipelineJobDetailResponse,
} from '@aj-mock-hub/contracts';
import { catchError, forkJoin, of, switchMap, takeWhile, timer } from 'rxjs';
import { ProjectsApiService } from '../core/projects-api.service';

export function formatPipelineLog(message: string) {
  return message
    .split(String.fromCharCode(27))
    .join('')
    .replace(/\[[0-9;]*m/g, '');
}

@Component({
  selector: 'app-version-workspace',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  styleUrl: './version-workspace.component.scss',
  template: `
    <a class="back-link" [routerLink]="['/projects', projectId]"
      >← Project history</a
    >
    @if (loading()) {
      <section class="state">Opening requirements workspace…</section>
    } @else if (error() || !project() || !version()) {
      <section class="state error" role="alert">
        <h1>Version unavailable</h1>
        <p>The immutable project version could not be loaded.</p>
      </section>
    } @else {
      <header class="workspace-hero">
        <div>
          <span class="workspace-kicker"
            >Version {{ version()!.versionNumber }} ·
            {{ version()!.status }}</span
          >
          <h1>{{ project()!.name }}</h1>
          <p>{{ version()!.label }}</p>
        </div>
        <span
          class="stage-pill"
          [class.approved]="specification()?.status === 'APPROVED'"
        >
          {{ specification()?.status || 'Requirements' }}
        </span>
      </header>

      <div class="workspace-layout">
        <aside class="requirements-rail">
          <section class="glass-panel instruction-panel">
            <span class="panel-index">01</span>
            <h2>Instruction snapshot</h2>
            <p>{{ version()!.instructionsSnapshot }}</p>
          </section>

          <section class="glass-panel document-panel">
            <div class="panel-title-row">
              <div>
                <span class="panel-index">02</span>
                <h2>Source documents</h2>
              </div>
              <span>{{ documents().length }}/10</span>
            </div>
            <p class="panel-copy">TXT, Markdown, PDF or DOCX · maximum 10 MB</p>
            <label class="upload-control">
              <input
                type="file"
                accept=".txt,.md,.pdf,.docx"
                [disabled]="
                  uploading() || specification()?.status === 'APPROVED'
                "
                (change)="upload($event)"
              />
              <span>{{
                uploading() ? 'Uploading…' : 'Add requirement file'
              }}</span>
            </label>
            @if (documents().length) {
              <ul class="document-list">
                @for (document of documents(); track document.id) {
                  <li>
                    <span class="file-icon">{{
                      extension(document.originalName)
                    }}</span>
                    <span
                      ><strong>{{ document.originalName }}</strong
                      ><small>{{ formatBytes(document.byteSize) }}</small></span
                    >
                    <i [class.failed]="document.status === 'FAILED'">{{
                      document.status
                    }}</i>
                  </li>
                }
              </ul>
            }
          </section>
        </aside>

        <section class="specification-stage glass-panel">
          <div class="specification-header">
            <div>
              <span class="panel-index">03</span>
              <h2>UI specification</h2>
              <p>
                Review the framework-independent plan before Angular generation.
              </p>
            </div>
            @if (!specification()) {
              <button
                class="button"
                type="button"
                [disabled]="extracting()"
                (click)="extract()"
              >
                {{ extracting() ? 'Extracting…' : 'Extract requirements' }}
              </button>
            }
          </div>

          @if (actionError()) {
            <p class="form-error action-error" role="alert">
              {{ actionError() }}
            </p>
          }

          @if (!specification()) {
            <div class="spec-empty">
              <span class="spec-orbit" aria-hidden="true"
                ><i></i><i></i><i></i
              ></span>
              <h3>Ready for structured extraction</h3>
              <p>
                Your immutable instructions and source documents will become an
                editable UI plan.
              </p>
            </div>
          } @else {
            <div class="spec-summary">
              <span>{{ specification()!.content.pages.length }} pages</span>
              <span
                >{{ specification()!.content.workflows.length }} workflows</span
              >
              <span
                >{{ specification()!.content.openQuestions.length }} open
                questions</span
              >
            </div>
            <div class="spec-preview">
              <div class="summary-block">
                <small>Product summary</small>
                <p>{{ specification()!.content.productSummary }}</p>
              </div>
              <div class="page-plan-grid">
                @for (page of specification()!.content.pages; track page.id) {
                  <article>
                    <span>{{ page.route }}</span>
                    <h3>{{ page.name }}</h3>
                    <p>{{ page.purpose }}</p>
                  </article>
                }
              </div>
            </div>

            @if (specification()!.status === 'DRAFT') {
              <details class="json-editor" [open]="editing()">
                <summary (click)="editing.set(!editing())">
                  Edit complete specification
                </summary>
                <p>
                  Advanced structured editor. Invalid fields will be rejected
                  safely.
                </p>
                <textarea
                  [formControl]="specificationJson"
                  rows="20"
                  spellcheck="false"
                ></textarea>
              </details>
              <div class="spec-actions">
                <button
                  class="secondary-button"
                  type="button"
                  [disabled]="saving()"
                  (click)="save()"
                >
                  {{ saving() ? 'Saving…' : 'Save corrections' }}
                </button>
                <button
                  class="button"
                  type="button"
                  [disabled]="approving()"
                  (click)="approve()"
                >
                  {{ approving() ? 'Approving…' : 'Approve specification' }}
                </button>
              </div>
              <p class="immutability-note">
                Approval is permanent for this project version.
              </p>
            } @else {
              <div class="approved-banner">
                <span>✓</span>
                <div>
                  <strong>Specification approved</strong>
                  <p>
                    This plan is immutable and ready for staged Angular
                    generation.
                  </p>
                </div>
              </div>
              <div class="generation-action">
                <div>
                  <strong>Generate Angular workspace</strong>
                  <p>
                    Controlled files will be linted, tested and built inside the
                    isolated builder container.
                  </p>
                </div>
                @if (!preview()) {
                  <button
                    class="button"
                    type="button"
                    [disabled]="generating()"
                    (click)="generate()"
                  >
                    {{ generating() ? 'Queueing…' : 'Generate Angular app' }}
                  </button>
                } @else {
                  <a
                    class="button"
                    [routerLink]="[
                      '/projects',
                      projectId,
                      'versions',
                      versionId,
                      'preview',
                    ]"
                    >Open preview →</a
                  >
                }
              </div>
              @if (generationJob()) {
                <section class="build-console" aria-live="polite">
                  <header>
                    <div>
                      <span
                        class="console-status"
                        [attr.data-status]="generationJob()!.status"
                      >
                        <i></i>{{ generationJob()!.status }}
                      </span>
                      <h3>Generation activity</h3>
                    </div>
                    @if (canCancelGeneration()) {
                      <button
                        type="button"
                        [disabled]="cancelling()"
                        (click)="cancelGeneration()"
                      >
                        {{ cancelling() ? 'Cancelling…' : 'Cancel job' }}
                      </button>
                    }
                  </header>
                  <div class="console-metrics">
                    <span
                      ><small>Attempt</small
                      ><strong
                        >{{ generationJob()!.attempts }}/{{
                          generationJob()!.maxAttempts
                        }}</strong
                      ></span
                    >
                    <span
                      ><small>Type</small
                      ><strong>Angular generation</strong></span
                    >
                    <span
                      ><small>Updated</small
                      ><strong>{{
                        generationJob()!.updatedAt | date: 'mediumTime'
                      }}</strong></span
                    >
                  </div>
                  <ol class="console-logs" aria-label="Generation logs">
                    @for (log of generationJob()!.logs; track log.id) {
                      <li [attr.data-level]="log.level">
                        <time [dateTime]="log.createdAt">{{
                          log.createdAt | date: 'HH:mm:ss'
                        }}</time>
                        <span>{{ log.level }}</span>
                        <p>{{ formatLog(log.message) }}</p>
                      </li>
                    } @empty {
                      <li class="console-empty">
                        <p>Waiting for the first worker update…</p>
                      </li>
                    }
                  </ol>
                  @if (generationJob()!.errorMessage) {
                    <p class="console-error" role="alert">
                      {{ generationJob()!.errorMessage }}
                    </p>
                  }
                </section>
              }
              @if (preview()) {
                <section class="export-panel">
                  <div class="export-heading">
                    <div>
                      <strong>Developer handoff</strong>
                      <p>
                        Package clean Angular source or share an expiring link.
                      </p>
                    </div>
                    <button
                      class="secondary-button"
                      type="button"
                      [disabled]="exporting()"
                      (click)="createExport()"
                    >
                      {{ exporting() ? 'Packaging…' : 'Create clean ZIP' }}
                    </button>
                  </div>
                  @if (exports().length) {
                    <div class="export-list">
                      @for (artifact of exports(); track artifact.id) {
                        <article>
                          <a [href]="artifact.downloadUrl">{{
                            artifact.fileName
                          }}</a>
                          <small
                            >{{ formatBytes(artifact.byteSize) }} ·
                            {{ artifact.fileCount }} files ·
                            {{ artifact.downloadCount }} downloads</small
                          >
                          <div class="share-row">
                            <input
                              type="email"
                              [formControl]="shareEmail"
                              placeholder="developer@example.com"
                            />
                            <button
                              type="button"
                              [disabled]="sharing() || shareEmail.invalid"
                              (click)="share(artifact)"
                            >
                              Share link
                            </button>
                          </div>
                        </article>
                      }
                    </div>
                  }
                  @if (shareStatus()) {
                    <p class="generation-status" role="status">
                      {{ shareStatus() }}
                    </p>
                  }
                </section>
              }
              @if (generationStatus()) {
                <p class="generation-status" role="status">
                  {{ generationStatus() }}
                </p>
              }
            }
          }
        </section>

        <aside class="workflow-rail glass-panel" aria-label="Version workflow">
          <div class="workflow-heading">
            <span class="panel-index">Flow</span>
            <h2>Version readiness</h2>
            <p>Progress is derived from this immutable version.</p>
          </div>
          <ol class="workflow-steps">
            <li class="is-complete">
              <span>✓</span>
              <div>
                <strong>Brief captured</strong
                ><small>Immutable instructions</small>
              </div>
            </li>
            <li [class.is-complete]="!!specification()">
              <span>{{ specification() ? '✓' : '2' }}</span>
              <div>
                <strong>Requirements extracted</strong
                ><small>{{
                  specification()
                    ? 'Structured UI plan ready'
                    : 'Awaiting extraction'
                }}</small>
              </div>
            </li>
            <li [class.is-complete]="specification()?.status === 'APPROVED'">
              <span>{{
                specification()?.status === 'APPROVED' ? '✓' : '3'
              }}</span>
              <div>
                <strong>Plan approved</strong
                ><small>{{
                  specification()?.status === 'APPROVED'
                    ? 'Locked for generation'
                    : 'Review required'
                }}</small>
              </div>
            </li>
            <li [class.is-complete]="!!preview()">
              <span>{{ preview() ? '✓' : '4' }}</span>
              <div>
                <strong>Build validated</strong
                ><small>{{
                  preview()
                    ? 'Preview is published'
                    : 'Isolated validation pending'
                }}</small>
              </div>
            </li>
          </ol>
          @if (preview()) {
            <a
              class="workflow-preview"
              [routerLink]="[
                '/projects',
                projectId,
                'versions',
                versionId,
                'preview',
              ]"
            >
              <span>Validated preview</span><strong>Open studio ↗</strong>
            </a>
          }
          <div class="integrity-card">
            <span aria-hidden="true">◇</span>
            <div>
              <strong>Immutable by design</strong>
              <p>Accepted changes always create a new sequential version.</p>
            </div>
          </div>
        </aside>
      </div>
    }
  `,
})
export class VersionWorkspaceComponent implements OnInit {
  private readonly api = inject(ProjectsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly projectId = this.route.snapshot.paramMap.get('projectId') ?? '';
  readonly versionId = this.route.snapshot.paramMap.get('versionId') ?? '';
  readonly project = signal<ProjectResponse | null>(null);
  readonly version = signal<ProjectVersionResponse | null>(null);
  readonly documents = signal<RequirementDocumentResponse[]>([]);
  readonly specification = signal<UiSpecificationResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly uploading = signal(false);
  readonly extracting = signal(false);
  readonly saving = signal(false);
  readonly approving = signal(false);
  readonly editing = signal(false);
  readonly actionError = signal('');
  readonly generating = signal(false);
  readonly generationStatus = signal('');
  readonly formatLog = formatPipelineLog;
  readonly generationJob = signal<PipelineJobDetailResponse | null>(null);
  readonly cancelling = signal(false);
  readonly preview = signal<StaticPreviewResponse | null>(null);
  readonly exports = signal<DeveloperExportResponse[]>([]);
  readonly exporting = signal(false);
  readonly sharing = signal(false);
  readonly shareStatus = signal('');
  readonly shareEmail = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });
  readonly specificationJson = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  ngOnInit() {
    if (!this.projectId || !this.versionId) {
      this.loading.set(false);
      this.error.set(true);
      return;
    }
    forkJoin({
      project: this.api.getProject(this.projectId),
      version: this.api.getVersion(this.projectId, this.versionId),
      documents: this.api.listDocuments(this.projectId, this.versionId),
      specification: this.api
        .getSpecification(this.projectId, this.versionId)
        .pipe(catchError(() => of(null))),
      preview: this.api
        .getPreview(this.projectId, this.versionId)
        .pipe(catchError(() => of(null))),
      exports: this.api
        .listExports(this.projectId, this.versionId)
        .pipe(catchError(() => of({ items: [] }))),
      jobs: this.api
        .listPipelineJobs(this.projectId, this.versionId)
        .pipe(catchError(() => of({ items: [] }))),
    }).subscribe({
      next: ({
        project,
        version,
        documents,
        specification,
        preview,
        exports,
        jobs,
      }) => {
        this.project.set(project);
        this.version.set(version);
        this.documents.set(documents.items);
        if (specification) this.setSpecification(specification);
        this.preview.set(preview);
        this.exports.set(exports.items);
        this.loading.set(false);
        const generationJob = jobs.items.find(
          (job) => job.type === 'ANGULAR_GENERATION',
        );
        if (generationJob) {
          this.loadGenerationJob(generationJob.id);
          if (!this.isTerminalJob(generationJob.status)) {
            this.pollGeneration(generationJob.id);
          }
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.uploading()) return;
    this.uploading.set(true);
    this.actionError.set('');
    this.api.uploadDocument(this.projectId, this.versionId, file).subscribe({
      next: (document) => {
        this.documents.update((items) => [...items, document]);
        this.uploading.set(false);
        input.value = '';
      },
      error: () => {
        this.actionError.set(
          'The document could not be uploaded. Check its type and size.',
        );
        this.uploading.set(false);
        input.value = '';
      },
    });
  }

  extract() {
    if (this.extracting()) return;
    this.extracting.set(true);
    this.actionError.set('');
    this.api.extractSpecification(this.projectId, this.versionId).subscribe({
      next: (specification) => {
        this.setSpecification(specification);
        this.extracting.set(false);
        this.reloadDocuments();
      },
      error: () => {
        this.actionError.set(
          'Requirements extraction failed. Review the source documents and retry.',
        );
        this.extracting.set(false);
        this.reloadDocuments();
      },
    });
  }

  save() {
    const current = this.specification();
    if (!current || this.saving()) return;
    let content: UiSpecificationResponse['content'];
    try {
      content = JSON.parse(this.specificationJson.value);
    } catch {
      this.actionError.set('The specification editor contains invalid JSON.');
      return;
    }
    this.saving.set(true);
    this.actionError.set('');
    this.api
      .updateSpecification(this.projectId, this.versionId, {
        expectedUpdatedAt: current.updatedAt,
        content,
      })
      .subscribe({
        next: (specification) => {
          this.setSpecification(specification);
          this.saving.set(false);
        },
        error: () => {
          this.actionError.set(
            'Corrections were not saved. Refresh if the specification changed elsewhere.',
          );
          this.saving.set(false);
        },
      });
  }

  approve() {
    const current = this.specification();
    if (!current || this.approving()) return;
    this.approving.set(true);
    this.actionError.set('');
    this.api
      .approveSpecification(this.projectId, this.versionId, current.updatedAt)
      .subscribe({
        next: (specification) => {
          this.setSpecification(specification);
          this.approving.set(false);
        },
        error: () => {
          this.actionError.set(
            'The specification could not be approved. Save or refresh it first.',
          );
          this.approving.set(false);
        },
      });
  }

  generate() {
    const specification = this.specification();
    if (!specification || this.generating()) return;
    this.generating.set(true);
    this.actionError.set('');
    this.api
      .generateAngularProject(
        this.projectId,
        this.versionId,
        `angular-generation-${specification.id}`,
      )
      .subscribe({
        next: ({ job, reused }) => {
          this.generationStatus.set(
            reused
              ? `Existing generation job: ${job.status}.`
              : 'Angular generation queued for isolated validation.',
          );
          this.generating.set(false);
          this.loadGenerationJob(job.id);
          if (!['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status)) {
            this.pollGeneration(job.id);
          } else if (job.status === 'COMPLETED') {
            this.loadPreview();
          }
        },
        error: () => {
          this.actionError.set(
            'Angular generation could not be queued. Confirm that the worker and Redis are running.',
          );
          this.generating.set(false);
        },
      });
  }

  extension(name: string) {
    return name.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE';
  }

  createExport() {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.actionError.set('');
    this.api.createExport(this.projectId, this.versionId).subscribe({
      next: (artifact) => {
        this.exports.update((items) => [artifact, ...items]);
        this.exporting.set(false);
        this.shareStatus.set('Clean developer ZIP is ready.');
      },
      error: () => {
        this.exporting.set(false);
        this.actionError.set('The developer handoff could not be packaged.');
      },
    });
  }

  share(artifact: DeveloperExportResponse) {
    if (this.sharing() || this.shareEmail.invalid) return;
    this.sharing.set(true);
    this.shareStatus.set('');
    this.api
      .shareExport(this.projectId, artifact.id, this.shareEmail.value)
      .subscribe({
        next: ({ recipient }) => {
          this.sharing.set(false);
          this.shareStatus.set(`Expiring download link sent to ${recipient}.`);
        },
        error: () => {
          this.sharing.set(false);
          this.actionError.set(
            'The handoff email could not be sent. Confirm Mailpit is running.',
          );
        },
      });
  }

  formatBytes(bytes: number) {
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  }

  canCancelGeneration() {
    const status = this.generationJob()?.status;
    return !!status && ['QUEUED', 'ACTIVE', 'RETRYING'].includes(status);
  }

  cancelGeneration() {
    const job = this.generationJob();
    if (!job || !this.canCancelGeneration() || this.cancelling()) return;
    this.cancelling.set(true);
    this.actionError.set('');
    this.api.cancelPipelineJob(this.projectId, job.id).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.loadGenerationJob(job.id);
      },
      error: () => {
        this.cancelling.set(false);
        this.actionError.set('The generation job could not be cancelled.');
      },
    });
  }

  private setSpecification(specification: UiSpecificationResponse) {
    this.specification.set(specification);
    this.specificationJson.setValue(
      JSON.stringify(specification.content, null, 2),
    );
  }

  private reloadDocuments() {
    this.api.listDocuments(this.projectId, this.versionId).subscribe({
      next: ({ items }) => this.documents.set(items),
    });
  }

  private pollGeneration(jobId: string) {
    timer(0, 1500)
      .pipe(
        switchMap(() => this.api.getPipelineJob(this.projectId, jobId)),
        takeWhile(
          (job) => !['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status),
          true,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (job) => {
          this.generationJob.set(job);
          this.generationStatus.set(`Angular generation: ${job.status}.`);
          if (job.status === 'COMPLETED') this.loadPreview();
          if (job.status === 'FAILED') {
            this.actionError.set(
              'Angular generation failed isolated validation. Review the job logs.',
            );
          }
        },
        error: () =>
          this.actionError.set('Generation status could not be refreshed.'),
      });
  }

  private loadGenerationJob(jobId: string) {
    this.api.getPipelineJob(this.projectId, jobId).subscribe({
      next: (job) => this.generationJob.set(job),
      error: () =>
        this.actionError.set('Generation activity could not be loaded.'),
    });
  }

  private isTerminalJob(status: string) {
    return ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status);
  }

  private loadPreview() {
    this.api.getPreview(this.projectId, this.versionId).subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.generationStatus.set('Validated static preview published.');
      },
      error: () =>
        this.actionError.set('The validated preview could not be loaded.'),
    });
  }
}
