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
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import type {
  DraftRevisionResponse,
  OptimisticPreviewOperationMessage,
  PreviewElementMessage,
  PreviewElementSelection,
  PreviewViewport,
  ProjectResponse,
  ProjectVersionResponse,
  StaticPreviewResponse,
  VisualRevisionOperation,
  VisualThemePreset,
} from '@aj-mock-hub/contracts';
import { forkJoin, switchMap, takeWhile, timer } from 'rxjs';
import { ProjectsApiService } from '../core/projects-api.service';

@Component({
  selector: 'app-preview-studio',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
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
              showingDraft() ? 'Draft preview' : 'Live app preview'
            }}</small>
            <h1>{{ project()!.name }}</h1>
            <p>
              Version {{ version()!.versionNumber }} · {{ version()!.label }}
            </p>
          </div>
          <div class="preview-controls">
            @if (revision()?.status === 'READY') {
              <div
                class="viewport-switcher mode-switcher"
                aria-label="Preview version"
              >
                <button
                  type="button"
                  [class.active]="!showingDraft()"
                  (click)="showAccepted()"
                >
                  Current
                </button>
                <button
                  type="button"
                  [class.active]="showingDraft()"
                  (click)="showRevision()"
                >
                  New changes
                </button>
              </div>
            }
            <div class="viewport-switcher" aria-label="Preview viewport">
              @for (option of viewports; track option.value) {
                <button
                  type="button"
                  [class.active]="viewport() === option.value"
                  (click)="viewport.set(option.value)"
                  [attr.aria-label]="option.label + ' preview'"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    @if (option.value === 'DESKTOP') {
                      <path d="M3 4h18v12H3zM8 20h8M12 16v4" />
                    } @else if (option.value === 'TABLET') {
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <path d="M10 18h4" />
                    } @else {
                      <rect x="7" y="2" width="10" height="20" rx="2" />
                      <path d="M10 18h4" />
                    }</svg
                  >{{ option.label }}
                </button>
              }
            </div>
            <button
              class="editor-toggle"
              type="button"
              [attr.aria-pressed]="editorOpen()"
              (click)="editorOpen.set(!editorOpen())"
            >
              {{ editorOpen() ? 'Hide editor' : 'Edit app' }}
            </button>
          </div>
        </header>

        <dl class="preview-meta" aria-label="Published preview details">
          <div>
            <dt>Showing</dt>
            <dd>
              {{ showingDraft() ? 'New changes' : 'Current version' }}
            </dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{{ preview()!.publishedAt | date: 'medium' }}</dd>
          </div>
          <div>
            <dt>App files</dt>
            <dd>
              {{ preview()!.fileCount }} files ·
              {{ formatBytes(preview()!.totalBytes) }}
            </dd>
          </div>
          <div>
            <dt>Screen size</dt>
            <dd>{{ viewport().toLowerCase() }}</dd>
          </div>
        </dl>

        <div class="studio-grid">
          <section class="preview-canvas">
            <div class="browser-chrome">
              <i></i><i></i><i></i>
              <span>Safe app preview · {{ preview()!.fileCount }} files</span>
            </div>
            <div class="device-stage" [class.is-loading]="frameLoading()">
              <div class="device-frame" [attr.data-viewport]="viewport()">
                @if (frameLoading()) {
                  <div class="frame-loader" role="status">
                    <i></i><span>Opening secure preview</span>
                  </div>
                }
                <iframe
                  #previewFrame
                  [src]="activePreviewUrl()"
                  sandbox="allow-scripts"
                  title="Generated Angular application preview"
                  (load)="onFrameLoad()"
                ></iframe>
              </div>
            </div>
          </section>

          @if (editorOpen()) {
            <aside class="inspector-panel">
              <small>Edit selected item</small>
              @if (selected()) {
                <div class="selection-card">
                  <span>{{
                    selected()!.type === 'button' ? 'Button' : 'Section'
                  }}</span>
                  <h2>{{ selected()!.label }}</h2>
                  <details class="developer-details">
                    <summary>Developer details</summary>
                    <dl>
                      <div>
                        <dt>Item ID</dt>
                        <dd>{{ selected()!.id }}</dd>
                      </div>
                      <div>
                        <dt>Page</dt>
                        <dd>{{ selected()!.pageId }}</dd>
                      </div>
                      <div>
                        <dt>File</dt>
                        <dd>{{ selected()!.file }}</dd>
                      </div>
                    </dl>
                  </details>
                </div>
                @if (
                  !revision() ||
                  ['FAILED', 'DISCARDED', 'ACCEPTED'].includes(
                    revision()!.status
                  )
                ) {
                  <div class="revision-form">
                    <div
                      class="editor-tabs"
                      role="tablist"
                      aria-label="Editing tools"
                    >
                      @for (tab of editorTabs; track tab.value) {
                        <button
                          type="button"
                          role="tab"
                          [attr.aria-selected]="editorTab() === tab.value"
                          [class.active]="editorTab() === tab.value"
                          (click)="editorTab.set(tab.value)"
                        >
                          {{ tab.label }}
                        </button>
                      }
                    </div>
                    @if (editorTab() === 'CONTENT') {
                      <label
                        >Text<input [formControl]="replacementText"
                      /></label>
                      <label
                        >What should change?<textarea
                          [formControl]="instruction"
                          rows="3"
                        ></textarea>
                      </label>
                      <button
                        type="button"
                        [disabled]="
                          creatingRevision() ||
                          instruction.invalid ||
                          replacementText.invalid
                        "
                        (click)="createRevision('RENAME')"
                      >
                        {{
                          creatingRevision()
                            ? 'Starting…'
                            : 'Preview text change'
                        }}
                      </button>
                    } @else if (editorTab() === 'STYLE') {
                      <div class="color-grid">
                        <label
                          >Text color<input
                            type="color"
                            [formControl]="textColor"
                        /></label>
                        <label
                          >Background<input
                            type="color"
                            [formControl]="backgroundColor"
                        /></label>
                      </div>
                      <button
                        type="button"
                        [disabled]="creatingRevision()"
                        (click)="createRevision('RECOLOR')"
                      >
                        Preview colors
                      </button>
                      <div class="theme-picker">
                        <span>Page theme</span>
                        <div>
                          @for (preset of themePresets; track preset.value) {
                            <button
                              type="button"
                              class="theme-swatch"
                              [class.active]="
                                themePreset.value === preset.value
                              "
                              [style.--swatch]="preset.color"
                              (click)="themePreset.setValue(preset.value)"
                            >
                              <i></i>{{ preset.label }}
                            </button>
                          }
                        </div>
                      </div>
                      <button
                        type="button"
                        class="secondary-action"
                        [disabled]="creatingRevision()"
                        (click)="createRevision('THEME')"
                      >
                        Preview page theme
                      </button>
                    } @else {
                      <button
                        type="button"
                        [disabled]="creatingRevision()"
                        (click)="createRevision('CLONE')"
                      >
                        Duplicate this item
                      </button>
                      <div class="add-button-control">
                        <label
                          >New button text<input [formControl]="buttonLabel"
                        /></label>
                        <button
                          type="button"
                          [disabled]="creatingRevision() || buttonLabel.invalid"
                          (click)="createRevision('ADD_BUTTON')"
                        >
                          Add button to page
                        </button>
                      </div>
                    }
                  </div>
                }
                @if (revision()) {
                  <div
                    class="revision-status"
                    [attr.data-status]="revision()!.status"
                  >
                    <span>{{ revisionStatusLabel() }}</span>
                    <p>{{ revisionMessage() }}</p>
                  </div>
                  @if (revision()!.status === 'READY') {
                    <label class="accept-label"
                      >Name this version<input [formControl]="versionLabel"
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
                        Save version
                      </button>
                    </div>
                  }
                }
                @if (actionError()) {
                  <p class="revision-error" role="alert">{{ actionError() }}</p>
                }
              } @else {
                <div class="inspector-empty">
                  <span>↖</span>
                  <h2>Click anything to edit</h2>
                  <p>
                    Select a card or button in the app preview. Its editing
                    tools will appear here.
                  </p>
                </div>
              }
              <footer>
                <span>Preview fingerprint</span>
                <code>{{ preview()!.contentHash.slice(0, 12) }}…</code>
              </footer>
            </aside>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        min-width: 0;
        overflow-x: clip;
      }
      .preview-studio {
        box-sizing: border-box;
        width: 100%;
        max-width: 1600px;
        margin: 0 auto;
        padding: 18px;
      }
      .preview-back {
        display: inline-flex;
        margin: 0 0 12px;
        color: #7cf6c3;
        font-size: 0.76rem;
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
        display: grid;
        grid-template-columns: minmax(240px, 1fr) auto;
        align-items: end;
        gap: 18px;
        margin-bottom: 12px;
      }
      .preview-toolbar > div,
      .preview-controls,
      .studio-grid,
      .preview-canvas {
        min-width: 0;
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
        max-width: 620px;
        margin: 5px 0 1px;
        font-size: clamp(1.8rem, 3vw, 3rem);
        line-height: 1.03;
        overflow-wrap: anywhere;
      }
      .preview-toolbar p {
        margin: 0;
        color: #93a29b;
        font-size: 0.78rem;
      }
      .viewport-switcher {
        display: flex;
        padding: 4px;
        border: 1px solid #ffffff1a;
        border-radius: 13px;
        background: #111b17cc;
      }
      .preview-controls {
        display: flex;
        max-width: 100%;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .editor-toggle {
        min-height: 36px;
        padding: 0 12px;
        color: #b7c5bd;
        background: rgba(11, 18, 15, 0.86);
        border: 1px solid #ffffff1a;
        border-radius: 10px;
        font-size: 0.7rem;
        font-weight: 760;
        cursor: pointer;
        transition:
          color 150ms ease,
          border-color 150ms ease,
          transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
      }
      .editor-toggle[aria-pressed='true'] {
        color: #7cf6c3;
        border-color: #7cf6c34a;
      }
      .editor-toggle:active {
        transform: scale(0.97);
      }
      .mode-switcher {
        border-color: #9885ff38;
      }
      .viewport-switcher button {
        display: inline-flex;
        gap: 6px;
        align-items: center;
        padding: 7px 10px;
        border: 0;
        border-radius: 9px;
        color: #91a099;
        background: transparent;
        cursor: pointer;
        font-weight: 750;
        transition:
          color 150ms ease,
          background 150ms ease,
          transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
      }
      .viewport-switcher svg {
        width: 16px;
        height: 16px;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.7;
      }
      .viewport-switcher button:active {
        transform: scale(0.97);
      }
      .viewport-switcher button.active {
        color: #07100c;
        background: #7cf6c3;
      }
      .preview-meta {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin: 0 0 10px;
        overflow: hidden;
        border: 1px solid #ffffff16;
        border-radius: 11px;
        background: #0d1512a8;
      }
      .preview-meta div {
        display: grid;
        gap: 4px;
        padding: 8px 12px;
        border-right: 1px solid #ffffff12;
      }
      .preview-meta div:last-child {
        border-right: 0;
      }
      .preview-meta dt {
        color: #65766d;
        font-size: 0.58rem;
        font-weight: 760;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .preview-meta dd {
        margin: 0;
        color: #b8c5be;
        font-size: 0.7rem;
        font-weight: 680;
        text-transform: capitalize;
      }
      .developer-details {
        margin-top: 14px;
        color: #84938b;
        font-size: 0.68rem;
      }
      .developer-details summary {
        cursor: pointer;
        font-weight: 720;
      }
      .editor-tabs {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 4px;
        padding: 4px;
        background: #08100c;
        border: 1px solid #ffffff12;
        border-radius: 11px;
      }
      .editor-tabs button {
        padding: 8px 5px;
        color: #73827a;
        background: transparent;
        border: 0;
        border-radius: 8px;
        font-size: 0.63rem;
      }
      .editor-tabs button.active {
        color: #07100c;
        background: #7cf6c3;
      }
      .color-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .color-grid input[type='color'] {
        width: 100%;
        height: 42px;
        padding: 4px;
        cursor: pointer;
      }
      .theme-picker {
        display: grid;
        gap: 8px;
      }
      .theme-picker > span {
        color: #a8b6af;
        font-size: 0.68rem;
        font-weight: 720;
      }
      .theme-picker > div {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      .revision-form .theme-swatch {
        display: flex;
        gap: 7px;
        align-items: center;
        padding: 8px;
        color: #93a199;
        background: #0a120e;
        border: 1px solid #ffffff14;
        font-size: 0.62rem;
      }
      .theme-swatch i {
        width: 12px;
        height: 12px;
        background: var(--swatch);
        border-radius: 50%;
        box-shadow: 0 0 10px color-mix(in srgb, var(--swatch) 50%, transparent);
      }
      .revision-form .theme-swatch.active {
        color: #dff9ec;
        border-color: var(--swatch);
      }
      .revision-form .secondary-action {
        color: #b7c4bd;
        background: #111a16;
        border: 1px solid #ffffff1c;
      }
      .add-button-control {
        display: grid;
        gap: 10px;
        padding-top: 14px;
        border-top: 1px solid #ffffff12;
      }
      .studio-grid {
        position: relative;
        width: 100%;
        min-width: 0;
      }
      .preview-canvas,
      .inspector-panel {
        border: 1px solid #d9ffea1d;
        border-radius: 16px;
        background: linear-gradient(145deg, #ffffff0c, transparent), #0c1411d9;
        box-shadow: 0 16px 46px #0004;
      }
      .preview-canvas {
        width: 100%;
        min-width: 0;
        overflow: hidden;
      }
      .browser-chrome {
        height: 38px;
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
        min-height: 726px;
        padding: 12px;
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
        position: relative;
        width: 100%;
        height: 700px;
        overflow: hidden;
        border: 1px solid #ffffff24;
        border-radius: 10px;
        background: #070b0a;
        transition: width 180ms cubic-bezier(0.23, 1, 0.32, 1);
        box-shadow: 0 12px 32px #0006;
      }
      .frame-loader {
        position: absolute;
        z-index: 2;
        display: grid;
        gap: 12px;
        color: #7f9087;
        background: #080e0b;
        inset: 0;
        place-content: center;
        justify-items: center;
        font-size: 0.7rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .frame-loader i {
        width: 24px;
        height: 24px;
        border: 2px solid #7cf6c32c;
        border-top-color: #7cf6c3;
        border-radius: 50%;
        animation: frame-spin 700ms linear infinite;
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
      .device-frame[data-viewport='DESKTOP'] {
        width: min(100%, 1280px);
      }
      .inspector-panel {
        position: absolute;
        z-index: 3;
        top: 10px;
        right: 10px;
        bottom: 10px;
        width: 286px;
        padding: 18px;
        display: flex;
        min-height: 0;
        flex-direction: column;
        background:
          linear-gradient(145deg, #ffffff0b, transparent), rgba(9, 16, 13, 0.95);
        backdrop-filter: blur(22px) saturate(135%);
      }
      .selection-card {
        margin-top: 18px;
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
        margin: 12px 0 14px;
        font-size: 1.3rem;
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
      .revision-form .editor-tabs button {
        padding: 8px 5px;
        color: #73827a;
        background: transparent;
      }
      .revision-form .editor-tabs button.active {
        color: #07100c;
        background: #7cf6c3;
      }
      .revision-status {
        margin-top: 12px;
        padding: 10px;
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
        margin-top: 10px;
      }
      .revision-actions {
        display: flex;
        gap: 6px;
        justify-content: flex-end;
        margin-top: 8px;
      }
      .revision-actions button {
        width: auto;
        min-height: 34px;
        padding: 0 12px;
        border-radius: 8px;
        font-size: 0.7rem;
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
      @media (max-width: 1120px) {
        .preview-toolbar {
          align-items: flex-start;
          grid-template-columns: 1fr;
        }
        .preview-controls {
          width: 100%;
          justify-content: flex-start;
        }
        .preview-meta {
          grid-template-columns: repeat(2, 1fr);
        }
        .preview-meta div:nth-child(2) {
          border-right: 0;
        }
        .preview-meta div:nth-child(-n + 2) {
          border-bottom: 1px solid #ffffff12;
        }
        .studio-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .inspector-panel {
          position: static;
          width: auto;
          min-height: 340px;
        }
        .device-stage {
          min-height: 590px;
        }
        .device-frame {
          height: 600px;
        }
      }
      @media (max-width: 980px) {
        .preview-studio {
          padding: 14px;
        }
      }
      @media (max-width: 620px) {
        .viewport-switcher {
          width: 100%;
          overflow: auto;
        }
        .preview-controls,
        .viewport-switcher {
          align-items: stretch;
          flex-direction: column;
        }
        .viewport-switcher {
          flex-direction: row;
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
      @keyframes frame-spin {
        to {
          transform: rotate(360deg);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .frame-loader i {
          animation-duration: 1.4s;
        }
        .viewport-switcher button {
          transition:
            color 150ms ease,
            background 150ms ease;
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
  readonly optimisticApplied = signal(false);
  readonly editorOpen = signal(false);
  readonly creatingRevision = signal(false);
  readonly acting = signal(false);
  readonly actionError = signal('');
  readonly frameLoading = signal(true);
  readonly instruction = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(2000)],
  });
  readonly replacementText = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(120)],
  });
  readonly textColor = new FormControl('#f4f8f5', { nonNullable: true });
  readonly backgroundColor = new FormControl('#101915', { nonNullable: true });
  readonly buttonLabel = new FormControl('Get started', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(120)],
  });
  readonly themePreset = new FormControl<VisualThemePreset>('AURORA', {
    nonNullable: true,
  });
  readonly editorTab = signal<'CONTENT' | 'STYLE' | 'ACTIONS'>('CONTENT');
  readonly editorTabs = [
    { value: 'CONTENT' as const, label: 'Content' },
    { value: 'STYLE' as const, label: 'Style' },
    { value: 'ACTIONS' as const, label: 'Actions' },
  ];
  readonly themePresets: ReadonlyArray<{
    value: VisualThemePreset;
    label: string;
    color: string;
  }> = [
    { value: 'AURORA', label: 'Aurora', color: '#7cf6c3' },
    { value: 'MIDNIGHT', label: 'Midnight', color: '#8fa7ff' },
    { value: 'PAPER', label: 'Paper', color: '#276749' },
    { value: 'SUNSET', label: 'Sunset', color: '#ff8c69' },
  ];
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
    this.editorOpen.set(false);
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
    if (this.isPreviewBridgeMessage(event.data)) {
      if (event.data.type === 'ajmh:preview-operation-applied') {
        this.optimisticApplied.set(true);
      } else {
        const revision = this.revision();
        if (revision?.status === 'VALIDATING') {
          this.applyOptimisticPreview(
            this.previewMessageFromRevision(revision),
          );
        }
      }
      return;
    }
    if (!this.isSelectionMessage(event.data)) return;
    this.selected.set(event.data.element);
    this.editorOpen.set(true);
    this.replacementText.setValue(event.data.element.label);
    this.instruction.setValue(
      `Update ${event.data.element.label} on ${event.data.element.pageId}.`,
    );
  }

  createRevision(operation: VisualRevisionOperation): void {
    const target = this.selected();
    if (
      !target ||
      this.instruction.invalid ||
      this.replacementText.invalid ||
      this.creatingRevision()
    ) {
      return;
    }
    const previewMessage = this.previewMessage(
      operation,
      target,
      `pending-${crypto.randomUUID()}`,
    );
    this.applyOptimisticPreview(previewMessage);
    this.creatingRevision.set(true);
    this.actionError.set('');
    this.api
      .createRevision(this.projectId, this.versionId, {
        instruction: this.instructionFor(operation),
        replacementText: this.replacementText.value,
        target,
        operation,
        textColor: operation === 'RECOLOR' ? this.textColor.value : null,
        backgroundColor:
          operation === 'RECOLOR' ? this.backgroundColor.value : null,
        buttonLabel: operation === 'ADD_BUTTON' ? this.buttonLabel.value : null,
        themePreset: operation === 'THEME' ? this.themePreset.value : null,
      })
      .subscribe({
        next: (revision) => {
          this.revision.set(revision);
          this.creatingRevision.set(false);
          this.versionLabel.setValue(this.versionLabelFor(operation));
          this.pollRevision(revision.id);
        },
        error: () => {
          this.creatingRevision.set(false);
          this.showAccepted();
          this.actionError.set(
            'The draft could not be queued. Confirm the worker is running.',
          );
        },
      });
  }

  private instructionFor(operation: VisualRevisionOperation): string {
    const selected = this.selected();
    const page = selected?.pageId ?? 'page';
    return {
      RENAME: this.instruction.value,
      RECOLOR: `Change the colors of ${selected?.label ?? 'the selected item'} on ${page}.`,
      CLONE: `Duplicate ${selected?.label ?? 'the selected item'} on ${page}.`,
      ADD_BUTTON: `Add a “${this.buttonLabel.value}” button to ${page}.`,
      THEME: `Apply the ${this.themePreset.value.toLowerCase()} theme to ${page}.`,
    }[operation];
  }

  private versionLabelFor(operation: VisualRevisionOperation): string {
    return {
      RENAME: `Text: ${this.replacementText.value}`,
      RECOLOR: 'Updated colors',
      CLONE: `Duplicated ${this.selected()?.label ?? 'item'}`,
      ADD_BUTTON: `Added ${this.buttonLabel.value} button`,
      THEME: `${this.themePreset.value.toLowerCase()} theme`,
    }[operation];
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
        'Your change is visible now. We’re checking it safely in the background.',
      READY:
        'Your changes are ready. Check the preview, then keep or remove them.',
      ACCEPTED: 'Your changes were saved as a new version.',
      DISCARDED: 'The changes were removed. Your current version is unchanged.',
      FAILED: revision.errorMessage ?? 'We could not build these changes.',
    }[revision.status];
  }

  revisionStatusLabel(): string {
    const status = this.revision()?.status;
    if (status === 'VALIDATING') {
      return this.optimisticApplied() ? 'Applied instantly' : 'Applying change';
    }
    if (status === 'READY') return 'Preview ready';
    return status ?? '';
  }

  onFrameLoad(): void {
    this.frameLoading.set(false);
    const revision = this.revision();
    if (revision?.status === 'VALIDATING') {
      this.applyOptimisticPreview(this.previewMessageFromRevision(revision));
    }
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  private loadLatestRevision(): void {
    this.api.listRevisions(this.projectId, this.versionId).subscribe({
      next: ({ items }) => {
        const latest = items[0];
        if (!latest || latest.status === 'ACCEPTED') return;
        this.revision.set(latest);
        if (latest.status === 'VALIDATING') {
          this.applyOptimisticPreview(this.previewMessageFromRevision(latest));
          this.pollRevision(latest.id);
        }
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
          if (revision.status === 'FAILED') this.showAccepted();
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
    this.frameLoading.set(true);
    this.activePreviewUrl.set(
      this.sanitizer.bypassSecurityTrustResourceUrl(path),
    );
  }

  private applyOptimisticPreview(
    message: OptimisticPreviewOperationMessage,
  ): void {
    this.showingDraft.set(true);
    this.optimisticApplied.set(false);
    this.previewFrame?.nativeElement.contentWindow?.postMessage(message, '*');
  }

  private previewMessage(
    operation: VisualRevisionOperation,
    target: PreviewElementSelection,
    messageId: string,
  ): OptimisticPreviewOperationMessage {
    return {
      type: 'ajmh:preview-operation',
      messageId,
      operation,
      targetId: target.id,
      replacementText:
        operation === 'RENAME' ? this.replacementText.value : null,
      textColor: operation === 'RECOLOR' ? this.textColor.value : null,
      backgroundColor:
        operation === 'RECOLOR' ? this.backgroundColor.value : null,
      buttonLabel: operation === 'ADD_BUTTON' ? this.buttonLabel.value : null,
      themePreset: operation === 'THEME' ? this.themePreset.value : null,
    };
  }

  private previewMessageFromRevision(
    revision: DraftRevisionResponse,
  ): OptimisticPreviewOperationMessage {
    return {
      type: 'ajmh:preview-operation',
      messageId: revision.id,
      operation: revision.operation,
      targetId: revision.target.id,
      replacementText: revision.replacementText,
      textColor: revision.textColor,
      backgroundColor: revision.backgroundColor,
      buttonLabel: revision.buttonLabel,
      themePreset: revision.themePreset,
    };
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

  private isPreviewBridgeMessage(
    value: unknown,
  ): value is
    | { type: 'ajmh:preview-bridge-ready' }
    | { type: 'ajmh:preview-operation-applied'; messageId: string } {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as { type?: unknown; messageId?: unknown };
    return (
      candidate.type === 'ajmh:preview-bridge-ready' ||
      (candidate.type === 'ajmh:preview-operation-applied' &&
        typeof candidate.messageId === 'string')
    );
  }
}
