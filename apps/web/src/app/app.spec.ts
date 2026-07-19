import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';

@Component({ template: '' })
class PreviewRouteStubComponent {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          {
            path: 'projects/:projectId/versions/:versionId/preview',
            component: PreviewRouteStubComponent,
          },
        ]),
      ],
    }).compileComponents();
  });

  it('renders the product identity and application outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain(
      'AJ Mock Hub',
    );
    expect(
      compiled
        .querySelector<HTMLImageElement>('.brand-mark img')
        ?.getAttribute('src'),
    ).toBe('aj-mock-hub-mark.svg');
    expect(compiled.querySelector('.brand')?.getAttribute('href')).toBe(
      '/projects',
    );
    expect(
      Array.from(compiled.querySelectorAll<HTMLAnchorElement>('.nav-link')).map(
        (link) => link.getAttribute('href'),
      ),
    ).toEqual(['/projects', '/projects/new', '/health']);
    expect(compiled.querySelector('.sound-toggle svg')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('renders the branded boot sequence and decorative depth layers', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const loader = compiled.querySelector<HTMLElement>('.boot-splash');

    expect(loader?.getAttribute('role')).toBe('status');
    expect(loader?.getAttribute('aria-label')).toBe(
      'Loading AJ Mock Hub workspace',
    );
    expect(loader?.querySelector('.boot-tile')).toBeTruthy();
    expect(loader?.querySelector('.boot-document')).toBeTruthy();
    expect(loader?.querySelector('.boot-command')).toBeTruthy();
    expect(compiled.querySelectorAll('.depth-prism')).toHaveLength(2);
    expect(compiled.querySelector('.grid-plane')).toBeTruthy();

    loader?.dispatchEvent(new Event('animationend'));
    fixture.detectChanges();

    expect(compiled.querySelector('.boot-splash')).toBeNull();
    expect(
      compiled.querySelector('.scene-stage')?.getAttribute('aria-hidden'),
    ).toBeNull();
  });

  it('uses a dedicated shell for the preview route', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl(
      '/projects/project-1/versions/version-1/preview',
    );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.shell')?.classList).toContain(
      'preview-shell',
    );
    expect(compiled.querySelector('main')?.classList).toContain('preview-main');
    expect(compiled.querySelector('.nav')).toBeNull();
    expect(compiled.querySelector('.site-footer')).toBeNull();
    expect(compiled.querySelector('app-depth-scene')).toBeNull();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
