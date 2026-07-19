import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProjectsApiService } from './core/projects-api.service';
import { SystemHealthComponent } from './system-health.component';

describe('SystemHealthComponent', () => {
  it('renders live API dependencies and uptime', async () => {
    await TestBed.configureTestingModule({
      imports: [SystemHealthComponent],
      providers: [
        provideRouter([]),
        {
          provide: ProjectsApiService,
          useValue: {
            getHealth: () =>
              of({
                service: 'api',
                status: 'ok',
                dependencies: { postgresql: 'ok', redis: 'ok' },
                uptimeSeconds: 7_440,
              }),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SystemHealthComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('API dependencies operational');
    expect(text).toContain('PostgreSQL');
    expect(text).toContain('Redis');
    expect(text).toContain('2h 4m');
  });
});
