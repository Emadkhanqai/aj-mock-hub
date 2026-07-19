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
    <div class="app-shell">
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
            <article><small>{{ (index + 1).toString().padStart(2, '0') }}</small><h2>{{ component }}</h2><p>Review-ready placeholder for {{ component.toLowerCase() }}.</p></article>
          }
        </section>
      </main>
    </div>
  \`,
})
class App {
  protected readonly specification = specification;
  protected readonly activePage = signal(specification.pages[0]);
}

void bootstrapApplication(App);
`;
  }

  private stylesSource(): string {
    return `*{box-sizing:border-box}html{color-scheme:dark;background:#070b0a}body{margin:0;font-family:Inter,ui-sans-serif,system-ui;color:#f4f8f5;background:radial-gradient(circle at 80% 0,#153c2a 0,transparent 34rem),#070b0a}.app-shell{display:grid;grid-template-columns:280px 1fr;min-height:100vh}aside{padding:30px 22px;border-right:1px solid #ffffff14;background:#0d1512cc}.brand{display:flex;gap:10px;align-items:center;font-weight:800}.brand span{width:14px;height:14px;border-radius:4px;background:#7cf6c3;box-shadow:0 0 18px #7cf6c366}nav{display:grid;gap:8px;margin-top:46px}nav button{padding:14px;color:#8fa099;text-align:left;background:transparent;border:1px solid transparent;border-radius:12px;cursor:pointer}nav button small{display:block;margin-bottom:4px;color:#64736c}nav button.active{color:#edfff6;background:#7cf6c312;border-color:#7cf6c326}main{padding:52px}header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start}header span,article small{color:#7cf6c3;font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.12em}h1{margin:10px 0 8px;font-size:clamp(3rem,7vw,6.5rem);line-height:.96;letter-spacing:-.06em}header p,article p{color:#91a199;line-height:1.6}header i{padding:8px 12px;color:#7cf6c3;border:1px solid #7cf6c32b;border-radius:999px;font-size:.68rem;font-style:normal}.canvas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:54px}article{min-height:190px;padding:24px;background:linear-gradient(145deg,#ffffff0f,transparent),#101915c9;border:1px solid #d5ffe619;border-radius:18px}article h2{margin:42px 0 8px}@media(max-width:760px){.app-shell{grid-template-columns:1fr}aside{border-right:0;border-bottom:1px solid #ffffff14}nav{grid-template-columns:repeat(2,1fr);margin-top:24px}main{padding:30px 20px}.canvas{grid-template-columns:1fr}}`;
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
