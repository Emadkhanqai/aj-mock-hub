import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import type {
  DraftRevisionResponse,
  PreviewElementMessage,
  PreviewElementSelection,
  PreviewViewport,
  ProjectResponse,
  ProjectVersionResponse,
  StaticPreviewResponse,
} from '@aj-mock-hub/contracts';
import { forkJoin, switchMap, takeWhile, timer } from 'rxjs';
import { ProjectsApiService } from '../core/projects-api.service';

@Component({
  selector: 'app-preview-studio',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="preview-studio">
      <a
        class="preview-back"
        [routerLink]="['/projects', projectId, 'versions', versionId]"
        >← Version workspace</a
      >
      @if (loading()) {
        <div class="preview-state">Loading validated preview…</div>
      } @else if (error() || !preview()) {
        <div class="preview-state preview-error" role="alert">
          <span>Preview unavailable</span>
          <h1>Validation must finish first.</h1>
          <p>
            Generate this version and keep the API and worker running. A static
            preview appears only after lint, tests and build all pass.
          </p>
        </div>
      } @else {
        <header class="preview-toolbar">
          <div>
            <small>{{
              showingDraft()
                ? 'Validated draft preview'
                : 'Validated static preview'
            }}</small>
            <h1>{{ project()!.name }}</h1>
            <p>
              Version {{ version()!.versionNumber }} · {{ version()!.label }}
            </p>
          </div>
          <div class="viewport-switcher" aria-label="Preview viewport">
            @if (revision()?.status === 'READY') {
              <button
                type="button"
                [class.active]="!showingDraft()"
                (click)="showAccepted()"
              >
                Accepted
              </button>
              <button
                type="button"
                [class.active]="showingDraft()"
                (click)="showRevision()"
              >
                Draft
              </button>
            }
            @for (option of viewports; track option.value) {
              <button
                type="button"
                [class.active]="viewport() === option.value"
                (click)="viewport.set(option.value)"
              >
                {{ option.label }}
              </button>
            }
          </div>
        </header>

        <div class="studio-grid">
          <section class="preview-canvas">
            <div class="browser-chrome">
              <i></i><i></i><i></i>
              <span
                >Secure static preview · {{ preview()!.fileCount }} files</span
              >
            </div>
            <div class="device-stage">
              <div class="device-frame" [attr.data-viewport]="viewport()">
                <iframe
                  #previewFrame
                  [src]="activePreviewUrl()"
                  sandbox="allow-scripts"
                  title="Generated Angular application preview"
                ></iframe>
              </div>
            </div>
          </section>

          <aside class="inspector-panel">
            <small>Element inspector</small>
            @if (selected()) {
              <div class="selection-card">
                <span>{{ selected()!.type }}</span>
                <h2>{{ selected()!.label }}</h2>
                <dl>
                  <div>
                    <dt>Element ID</dt>
                    <dd>{{ selected()!.id }}</dd>
                  </div>
                  <div>
                    <dt>Page</dt>
                    <dd>{{ selected()!.pageId }}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{{ selected()!.file }}</dd>
                  </div>
                </dl>
              </div>
              @if (
                !revision() ||
                ['FAILED', 'DISCARDED'].includes(revision()!.status)
              ) {
                <div class="revision-form">
                  <label
                    >Revision instruction<textarea
                      [formControl]="instruction"
                      rows="3"
                    ></textarea>
                  </label>
                  <label
                    >Replacement label<input [formControl]="replacementText"
                  /></label>
                  <button
                    type="button"
                    [disabled]="
                      creatingRevision() ||
                      instruction.invalid ||
                      replacementText.invalid
                    "
                    (click)="createRevision()"
                  >
                    {{
                      creatingRevision()
                        ? 'Queueing…'
                        : 'Create validated draft'
                    }}
                  </button>
                </div>
              }
              @if (revision()) {
                <div
                  class="revision-status"
                  [attr.data-status]="revision()!.status"
                >
                  <span>{{ revision()!.status }}</span>
                  <p>{{ revisionMessage() }}</p>
                </div>
                @if (revision()!.status === 'READY') {
                  <label class="accept-label"
                    >New version label<input [formControl]="versionLabel"
                  /></label>
                  <div class="revision-actions">
                    <button
                      type="button"
                      class="discard"
                      [disabled]="acting()"
                      (click)="discardRevision()"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      [disabled]="acting() || versionLabel.invalid"
                      (click)="acceptRevision()"
                    >
                      Accept as new version
                    </button>
                  </div>
                }
              }
              @if (actionError()) {
                <p class="revision-error" role="alert">{{ actionError() }}</p>
              }
            } @else {
              <div class="inspector-empty">
                <span>◎</span>
                <h2>Select an element</h2>
                <p>
                  Click a component inside the preview to capture its stable
                  element ID, type, page and source file.
                </p>
              </div>
            }
            <footer>
              <span>SHA-256</span>
              <code>{{ preview()!.contentHash.slice(0, 12) }}…</code>
            </footer>
          </aside>
        </div>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .preview-studio {
        width: min(1500px, calc(100vw - 48px));
        margin: 0 auto;
      }
      .preview-back {
        display: inline-flex;
        margin: 2px 0 22px;
        color: #7cf6c3;
        text-decoration: none;
        font-weight: 750;
      }
      .preview-state {
        min-height: 480px;
        display: grid;
        place-content: center;
        text-align: center;
        border: 1px solid #ffffff18;
        border-radius: 24px;
        background: #0d1512b8;
      }
      .preview-error h1 {
        max-width: 760px;
        margin: 12px auto;
        font-size: clamp(2.4rem, 6vw, 5rem);
        line-height: 0.98;
      }
      .preview-error p {
        max-width: 620px;
        color: #96a59e;
      }
      .preview-toolbar {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 20px;
      }
      .preview-toolbar small,
      .inspector-panel > small {
        color: #7cf6c3;
        font-size: 0.7rem;
        font-weight: 850;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      .preview-toolbar h1 {
        max-width: 760px;
        margin: 8px 0 2px;
        font-size: clamp(2.2rem, 5vw, 4.7rem);
        line-height: 1;
        overflow-wrap: anywhere;
      }
      .preview-toolbar p {
        margin: 0;
        color: #93a29b;
      }
      .viewport-switcher {
        display: flex;
        padding: 4px;
        border: 1px solid #ffffff1a;
        border-radius: 13px;
        background: #111b17cc;
      }
      .viewport-switcher button {
        padding: 9px 13px;
        border: 0;
        border-radius: 9px;
        color: #91a099;
        background: transparent;
        cursor: pointer;
        font-weight: 750;
      }
      .viewport-switcher button.active {
        color: #07100c;
        background: #7cf6c3;
      }
      .studio-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 330px;
        gap: 16px;
      }
      .preview-canvas,
      .inspector-panel {
        border: 1px solid #d9ffea1d;
        border-radius: 22px;
        background: linear-gradient(145deg, #ffffff0c, transparent), #0c1411d9;
        box-shadow: 0 24px 80px #0006;
      }
      .browser-chrome {
        height: 46px;
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 0 16px;
        border-bottom: 1px solid #ffffff14;
      }
      .browser-chrome i {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: #ffffff2b;
      }
      .browser-chrome i:first-child {
        background: #ff796f;
      }
      .browser-chrome i:nth-child(2) {
        background: #ffd76d;
      }
      .browser-chrome i:nth-child(3) {
        background: #7cf6c3;
      }
      .browser-chrome span {
        margin-left: 8px;
        color: #788980;
        font-size: 0.72rem;
      }
      .device-stage {
        min-height: 690px;
        padding: 24px;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        overflow: auto;
        background: radial-gradient(
          circle at 50% 0,
          #7cf6c310,
          transparent 45%
        );
      }
      .device-frame {
        width: 100%;
        height: 640px;
        overflow: hidden;
        border: 1px solid #ffffff24;
        border-radius: 13px;
        background: #070b0a;
        transition: width 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
        box-shadow: 0 18px 55px #0008;
      }
      .device-frame[data-viewport='TABLET'] {
        width: 768px;
      }
      .device-frame[data-viewport='MOBILE'] {
        width: 390px;
      }
      .device-frame iframe {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
        background: #070b0a;
      }
      .inspector-panel {
        padding: 24px;
        display: flex;
        min-height: 736px;
        flex-direction: column;
      }
      .selection-card {
        margin-top: 26px;
      }
      .selection-card > span {
        padding: 5px 9px;
        border: 1px solid #7cf6c344;
        border-radius: 999px;
        color: #7cf6c3;
        font-size: 0.68rem;
        text-transform: uppercase;
      }
      .selection-card h2 {
        margin: 16px 0 20px;
        font-size: 1.6rem;
        overflow-wrap: anywhere;
      }
      .selection-card dl {
        display: grid;
        gap: 10px;
      }
      .selection-card dl div {
        display: grid;
        gap: 3px;
      }
      .selection-card dt {
        color: #6f8077;
        font-size: 0.62rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .selection-card dd {
        margin: 0;
        color: #d7e2dc;
        font-size: 0.75rem;
        overflow-wrap: anywhere;
      }
      .revision-form {
        display: grid;
        gap: 12px;
        margin-top: 22px;
        padding-top: 18px;
        border-top: 1px solid #ffffff12;
      }
      .revision-form label,
      .accept-label {
        display: grid;
        gap: 6px;
        color: #aab8b1;
        font-size: 0.72rem;
      }
      .revision-form input,
      .revision-form textarea,
      .accept-label input {
        width: 100%;
        padding: 10px 11px;
        border: 1px solid #ffffff20;
        border-radius: 9px;
        color: #eef7f2;
        background: #070d0a;
        resize: vertical;
      }
      .revision-form button,
      .revision-actions button {
        padding: 10px;
        border: 0;
        border-radius: 10px;
        background: #7cf6c3;
        color: #07100c;
        font-weight: 800;
        cursor: pointer;
      }
      .revision-form button:disabled,
      .revision-actions button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .revision-status {
        margin-top: 18px;
        padding: 12px;
        border: 1px solid #7cf6c333;
        border-radius: 10px;
        color: #9fb0a8;
        font-size: 0.75rem;
      }
      .revision-status span {
        color: #7cf6c3;
        font-size: 0.65rem;
        font-weight: 850;
        letter-spacing: 0.12em;
      }
      .revision-status p {
        margin: 7px 0 0;
        line-height: 1.45;
      }
      .accept-label {
        margin-top: 14px;
      }
      .revision-actions {
        display: grid;
        grid-template-columns: 1fr 1.5fr;
        gap: 8px;
        margin-top: 10px;
      }
      .revision-actions .discard {
        color: #ffaaa4;
        background: #ff796f18;
        border: 1px solid #ff796f42;
      }
      .revision-error {
        color: #ffaaa4;
        font-size: 0.75rem;
      }
      .inspector-empty {
        margin: auto 0;
        text-align: center;
      }
      .inspector-empty > span {
        display: block;
        color: #7cf6c3;
        font-size: 3rem;
      }
      .inspector-empty h2 {
        margin: 12px 0 8px;
      }
      .inspector-empty p {
        color: #8c9c94;
        line-height: 1.55;
      }
      .inspector-panel footer {
        display: flex;
        justify-content: space-between;
        margin-top: auto;
        padding-top: 18px;
        border-top: 1px solid #ffffff12;
        color: #687970;
        font-size: 0.68rem;
      }
      .inspector-panel code {
        color: #a6b7ae;
      }
      @media (max-width: 980px) {
        .preview-studio {
          width: min(100% - 28px, 1500px);
        }
        .preview-toolbar {
          align-items: flex-start;
          flex-direction: column;
        }
        .studio-grid {
          grid-template-columns: 1fr;
        }
        .inspector-panel {
          min-height: 340px;
        }
        .device-stage {
          min-height: 590px;
        }
        .device-frame {
          height: 540px;
        }
      }
      @media (max-width: 620px) {
        .viewport-switcher {
          width: 100%;
          overflow: auto;
        }
        .viewport-switcher button {
          flex: 1;
        }
        .device-stage {
          padding: 12px;
        }
        .device-frame[data-viewport='MOBILE'] {
          width: 100%;
        }
      }
    `,
  ],
})
export class PreviewStudioComponent implements OnInit {
  private readonly api = inject(ProjectsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);
  @ViewChild('previewFrame') previewFrame?: ElementRef<HTMLIFrameElement>;
  projectId = '';
  versionId = '';
  readonly project = signal<ProjectResponse | null>(null);
  readonly version = signal<ProjectVersionResponse | null>(null);
  readonly preview = signal<StaticPreviewResponse | null>(null);
  readonly selected = signal<PreviewElementSelection | null>(null);
  readonly revision = signal<DraftRevisionResponse | null>(null);
  readonly activePreviewUrl = signal<SafeResourceUrl | null>(null);
  readonly showingDraft = signal(false);
  readonly creatingRevision = signal(false);
  readonly acting = signal(false);
  readonly actionError = signal('');
  readonly instruction = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(2000)],
  });
  readonly replacementText = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(120)],
  });
  readonly versionLabel = new FormControl('Targeted revision', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(120)],
  });
  readonly viewport = signal<PreviewViewport>('DESKTOP');
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly viewports: ReadonlyArray<{
    value: PreviewViewport;
    label: string;
  }> = [
    { value: 'DESKTOP', label: 'Desktop' },
    { value: 'TABLET', label: 'Tablet' },
    { value: 'MOBILE', label: 'Mobile' },
  ];

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((parameters) => {
        this.projectId = parameters.get('projectId') ?? '';
        this.versionId = parameters.get('versionId') ?? '';
        this.loadPreview();
      });
  }

  private loadPreview(): void {
    this.loading.set(true);
    this.error.set(false);
    this.selected.set(null);
    this.revision.set(null);
    this.showingDraft.set(false);
    this.actionError.set('');
    forkJoin({
      project: this.api.getProject(this.projectId),
      version: this.api.getVersion(this.projectId, this.versionId),
      preview: this.api.getPreview(this.projectId, this.versionId),
    }).subscribe({
      next: ({ project, version, preview }) => {
        this.project.set(project);
        this.version.set(version);
        this.preview.set(preview);
        this.setPreviewUrl(preview.entryUrl);
        this.loading.set(false);
        this.loadLatestRevision();
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  @HostListener('window:message', ['$event'])
  onPreviewMessage(event: MessageEvent<unknown>): void {
    if (event.source !== this.previewFrame?.nativeElement.contentWindow) return;
    if (!this.isSelectionMessage(event.data)) return;
    this.selected.set(event.data.element);
    this.replacementText.setValue(event.data.element.label);
    this.instruction.setValue(
      `Update ${event.data.element.label} on ${event.data.element.pageId}.`,
    );
  }

  createRevision(): void {
    const target = this.selected();
    if (
      !target ||
      this.instruction.invalid ||
      this.replacementText.invalid ||
      this.creatingRevision()
    ) {
      return;
    }
    this.creatingRevision.set(true);
    this.actionError.set('');
    this.api
      .createRevision(this.projectId, this.versionId, {
        instruction: this.instruction.value,
        replacementText: this.replacementText.value,
        target,
      })
      .subscribe({
        next: (revision) => {
          this.revision.set(revision);
          this.creatingRevision.set(false);
          this.versionLabel.setValue(`Revision: ${this.replacementText.value}`);
          this.pollRevision(revision.id);
        },
        error: () => {
          this.creatingRevision.set(false);
          this.actionError.set(
            'The draft could not be queued. Confirm the worker is running.',
          );
        },
      });
  }

  showAccepted(): void {
    const preview = this.preview();
    if (!preview) return;
    this.setPreviewUrl(preview.entryUrl);
    this.showingDraft.set(false);
  }

  showRevision(): void {
    const revision = this.revision();
    if (!revision?.previewEntryUrl) return;
    this.setPreviewUrl(revision.previewEntryUrl);
    this.showingDraft.set(true);
  }

  discardRevision(): void {
    const revision = this.revision();
    if (!revision || this.acting()) return;
    this.acting.set(true);
    this.api.discardRevision(this.projectId, revision.id).subscribe({
      next: (discarded) => {
        this.revision.set(discarded);
        this.showAccepted();
        this.acting.set(false);
      },
      error: () => {
        this.acting.set(false);
        this.actionError.set('The draft could not be discarded.');
      },
    });
  }

  acceptRevision(): void {
    const revision = this.revision();
    if (!revision || this.versionLabel.invalid || this.acting()) return;
    this.acting.set(true);
    this.api
      .acceptRevision(this.projectId, revision.id, this.versionLabel.value)
      .subscribe({
        next: ({ version }) => {
          void this.router.navigate([
            '/projects',
            this.projectId,
            'versions',
            version.id,
            'preview',
          ]);
        },
        error: () => {
          this.acting.set(false);
          this.actionError.set(
            'The revision could not be accepted as a new version.',
          );
        },
      });
  }

  revisionMessage(): string {
    const revision = this.revision();
    if (!revision) return '';
    return {
      VALIDATING:
        'Lint, tests and build are running inside the isolated container.',
      READY:
        'The draft passed validation. Compare it with the accepted preview.',
      ACCEPTED: 'This draft is preserved as a new immutable project version.',
      DISCARDED:
        'This temporary draft was discarded. The accepted version is unchanged.',
      FAILED: revision.errorMessage ?? 'The draft did not pass validation.',
    }[revision.status];
  }

  private loadLatestRevision(): void {
    this.api.listRevisions(this.projectId, this.versionId).subscribe({
      next: ({ items }) => {
        const latest = items[0];
        if (!latest || latest.status === 'ACCEPTED') return;
        this.revision.set(latest);
        if (latest.status === 'VALIDATING') this.pollRevision(latest.id);
      },
    });
  }

  private pollRevision(revisionId: string): void {
    timer(0, 1500)
      .pipe(
        switchMap(() => this.api.getRevision(this.projectId, revisionId)),
        takeWhile((revision) => revision.status === 'VALIDATING', true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (revision) => {
          this.revision.set(revision);
          if (revision.status === 'READY') this.showRevision();
        },
        error: () =>
          this.actionError.set('Revision status could not be refreshed.'),
      });
  }

  private setPreviewUrl(path: string): void {
    if (!path.startsWith('/api/projects/')) {
      this.actionError.set('The preview URL was rejected.');
      return;
    }
    this.activePreviewUrl.set(
      this.sanitizer.bypassSecurityTrustResourceUrl(path),
    );
  }

  private isSelectionMessage(value: unknown): value is PreviewElementMessage {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<PreviewElementMessage>;
    const element = candidate.element as
      | Partial<PreviewElementSelection>
      | undefined;
    return (
      candidate.type === 'ajmh:element-selected' &&
      !!element &&
      [
        element.id,
        element.type,
        element.file,
        element.pageId,
        element.label,
      ].every((field) => typeof field === 'string' && field.length > 0)
    );
  }
}
