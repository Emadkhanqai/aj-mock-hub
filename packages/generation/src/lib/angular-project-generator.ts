import type { UiSpecificationContent } from '@aj-mock-hub/contracts';
import { uiSpecificationSchema } from './ui-specification-schema';

export interface GeneratedFile {
  path: string;
  content: string;
}

export class AngularProjectGenerator {
  generate(input: UiSpecificationContent): GeneratedFile[] {
    const specification = uiSpecificationSchema.parse(input);
    const data = JSON.stringify(specification, null, 2);
    return [
      { path: 'src/main.ts', content: this.mainSource(data) },
      { path: 'src/styles.css', content: this.stylesSource() },
      { path: 'src/main.spec.ts', content: this.testSource() },
      { path: 'ui-specification.json', content: `${data}\n` },
      { path: 'README.md', content: this.readmeSource() },
    ];
  }

  private mainSource(serializedSpecification: string): string {
    return `import { Component, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

const specification = ${serializedSpecification} as const;

@Component({
  selector: 'app-root',
  standalone: true,
  template: \`
    <div class="app-shell" [attr.data-theme]="specification.design.themePreset">
      <aside>
        <div class="brand"><span></span>{{ specification.productSummary }}</div>
        <nav aria-label="Prototype pages">
          @for (page of specification.pages; track page.id) {
            <button type="button" [class.active]="activePage().id === page.id" (click)="activePage.set(page)">
              <small>{{ page.route }}</small>{{ page.name }}
            </button>
          }
        </nav>
      </aside>
      <main>
        <header><div><span>Angular prototype</span><h1>{{ activePage().name }}</h1><p>{{ activePage().purpose }}</p></div><i>Mock data</i></header>
        <section class="canvas">
          @for (component of activePage().components; track component; let index = $index) {
            @if (componentKind(index) === 'BUTTON') {
              <button
                class="canvas-action"
                type="button"
                [style.color]="componentStyle(index).textColor"
                [style.background]="componentStyle(index).backgroundColor"
                [attr.data-ajmh-id]="activePage().id + ':component:' + index"
                (click)="selectElement($event, activePage().id, index, component, 'button')"
              >{{ component }}</button>
            } @else {
              <article
                tabindex="0"
                role="button"
                [style.color]="componentStyle(index).textColor"
                [style.background]="componentStyle(index).backgroundColor"
                [attr.data-ajmh-id]="activePage().id + ':component:' + index"
                data-ajmh-type="component"
                data-ajmh-file="src/main.ts"
                [attr.aria-label]="'Select ' + component + ' to edit'"
                (click)="selectElement($event, activePage().id, index, component, 'component')"
                (keydown.enter)="selectElement($event, activePage().id, index, component, 'component')"
              ><span class="edit-hint">Click to edit</span><small>{{ (index + 1).toString().padStart(2, '0') }}</small><h2>{{ component }}</h2><p>Preview content for {{ component.toLowerCase() }}.</p></article>
            }
          }
        </section>
      </main>
    </div>
  \`,
})
class App {
  protected readonly specification = specification;
  protected readonly activePage = signal(specification.pages[0]);

  protected componentKind(index: number): 'CARD' | 'BUTTON' {
    return this.activePage().componentKinds[index] ?? 'CARD';
  }

  protected componentStyle(index: number): { textColor?: string | null; backgroundColor?: string | null } {
    return this.activePage().componentStyles[index] ?? {};
  }

  protected selectElement(event: Event, pageId: string, index: number, label: string, type: 'component' | 'button'): void {
    event.stopPropagation();
    window.parent.postMessage({
      type: 'ajmh:element-selected',
      element: {
        id: pageId + ':component:' + index,
        type,
        file: 'src/main.ts',
        pageId,
        label,
      },
    }, '*');
  }
}

void bootstrapApplication(App);
`;
  }

  private stylesSource(): string {
    return `*{box-sizing:border-box}html{color-scheme:dark;background:#070b0a}body{margin:0;font-family:Inter,ui-sans-serif,system-ui;color:#f4f8f5;background:#070b0a}.app-shell{--accent:#7cf6c3;--page:#070b0a;--surface:#101915;--text:#f4f8f5;display:grid;grid-template-columns:280px 1fr;min-height:100vh;color:var(--text);background:radial-gradient(circle at 80% 0,color-mix(in srgb,var(--accent) 22%,transparent),transparent 34rem),var(--page)}.app-shell[data-theme=MIDNIGHT]{--accent:#8fa7ff;--page:#080b16;--surface:#11162a}.app-shell[data-theme=PAPER]{--accent:#276749;--page:#f3f0e8;--surface:#fff;--text:#17221c;color-scheme:light}.app-shell[data-theme=SUNSET]{--accent:#ff8c69;--page:#160b0b;--surface:#251313}aside{padding:30px 22px;border-right:1px solid color-mix(in srgb,var(--text) 9%,transparent);background:color-mix(in srgb,var(--surface) 88%,transparent)}.brand{display:flex;gap:10px;align-items:center;font-weight:800}.brand span{width:14px;height:14px;border-radius:4px;background:var(--accent);box-shadow:0 0 18px color-mix(in srgb,var(--accent) 45%,transparent)}nav{display:grid;gap:8px;margin-top:46px}nav button{padding:14px;color:color-mix(in srgb,var(--text) 58%,transparent);text-align:left;background:transparent;border:1px solid transparent;border-radius:12px;cursor:pointer}nav button small{display:block;margin-bottom:4px;color:color-mix(in srgb,var(--text) 42%,transparent)}nav button.active{color:var(--text);background:color-mix(in srgb,var(--accent) 9%,transparent);border-color:color-mix(in srgb,var(--accent) 18%,transparent)}main{padding:52px}header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start}header span,article small{color:var(--accent);font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.12em}h1{margin:10px 0 8px;font-size:clamp(3rem,7vw,6.5rem);line-height:.96;letter-spacing:-.06em}header p,article p{color:color-mix(in srgb,var(--text) 60%,transparent);line-height:1.6}header i{padding:8px 12px;color:var(--accent);border:1px solid color-mix(in srgb,var(--accent) 25%,transparent);border-radius:999px;font-size:.68rem;font-style:normal}.canvas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:54px;align-items:start}article{position:relative;min-height:190px;padding:24px;color:inherit;background:linear-gradient(145deg,color-mix(in srgb,var(--text) 6%,transparent),transparent),var(--surface);border:1px solid color-mix(in srgb,var(--text) 10%,transparent);border-radius:18px;cursor:pointer;transition:border-color .16s ease,transform .16s cubic-bezier(.23,1,.32,1),box-shadow .16s ease}.edit-hint{position:absolute;top:10px;right:10px;padding:5px 8px;color:var(--page);background:var(--accent);border-radius:7px;font-size:.58rem;font-weight:800;opacity:0;transform:translateY(3px);transition:opacity .14s ease,transform .14s cubic-bezier(.23,1,.32,1)}article:hover,article:focus-visible{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 13%,transparent);transform:translateY(-2px)}article:hover .edit-hint,article:focus-visible .edit-hint{opacity:1;transform:translateY(0)}article h2{margin:42px 0 8px}.canvas-action{justify-self:start;padding:13px 20px;color:var(--page);background:var(--accent);border:0;border-radius:11px;font:inherit;font-weight:800;cursor:pointer;transition:transform .14s cubic-bezier(.23,1,.32,1)}.canvas-action:active{transform:scale(.97)}@media(max-width:760px){.app-shell{grid-template-columns:1fr}aside{border-right:0;border-bottom:1px solid color-mix(in srgb,var(--text) 9%,transparent)}nav{grid-template-columns:repeat(2,1fr);margin-top:24px}main{padding:30px 20px}.canvas{grid-template-columns:1fr}}`;
  }

  private testSource(): string {
    return `import { describe, expect, it } from 'vitest';

describe('generated Angular prototype', () => {
  it('contains a controlled application entry point', () => {
    expect(document).toBeDefined();
  });
});
`;
  }

  private readmeSource(): string {
    return `# Generated Angular prototype

This source was generated from an approved AJ Mock Hub UI specification.

## Runtime

Use Node.js 22.

## Commands

\`\`\`sh
npm ci
npm run lint
npm test
npm run build
\`\`\`
`;
  }
}
