import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { HealthResponse } from '@aj-mock-hub/contracts';
import { ProjectsApiService } from './core/projects-api.service';

@Component({
  selector: 'app-system-health',
  imports: [DatePipe, RouterLink],
  styleUrl: './system-health.component.scss',
  template: `
    <header class="page-header health-header">
      <div>
        <p class="eyebrow">System health</p>
        <h1>Local stack</h1>
        <p class="lede">
          Live readiness for the API database and job-delivery dependencies.
        </p>
      </div>
      <button
        class="button secondary"
        type="button"
        [disabled]="loading()"
        (click)="load()"
      >
        {{ loading() ? 'Checking…' : 'Refresh status' }}
      </button>
    </header>

    @if (loading() && !health()) {
      <section class="health-overview skeleton-state" aria-live="polite">
        <span class="status-orb"></span>
        <div>
          <small>Checking local services</small><strong>Connecting…</strong>
        </div>
      </section>
    } @else if (error() || !health()) {
      <section class="state error" role="alert">
        <h2>API is unavailable</h2>
        <p>Start the local API, then refresh this status page.</p>
        <button class="button secondary" type="button" (click)="load()">
          Try again
        </button>
      </section>
    } @else {
      <section
        class="health-overview"
        [class.is-degraded]="health()!.status === 'degraded'"
      >
        <span class="status-orb" aria-hidden="true"></span>
        <div>
          <small>AJ Mock Hub API</small>
          <strong>{{
            health()!.status === 'ok'
              ? 'API dependencies operational'
              : 'Attention required'
          }}</strong>
          <p>Last checked {{ checkedAt() | date: 'mediumTime' }}</p>
        </div>
        <span class="health-badge">{{ health()!.status }}</span>
      </section>

      <section class="health-grid" aria-label="Dependency status">
        @for (
          dependency of dependencies();
          track dependency.name;
          let index = $index
        ) {
          <article
            class="health-card"
            [class.is-unavailable]="dependency.status === 'unavailable'"
          >
            <header>
              <span>{{ (index + 1).toString().padStart(2, '0') }}</span>
              <i aria-hidden="true"></i>
            </header>
            <div>
              <small>Dependency</small>
              <h2>{{ dependency.label }}</h2>
              <p>{{ dependency.description }}</p>
            </div>
            <footer>
              <span>{{ dependency.status }}</span
              ><small>Local infrastructure</small>
            </footer>
          </article>
        }
        <article class="health-card metric-card">
          <header><span>03</span><i aria-hidden="true"></i></header>
          <div>
            <small>Process uptime</small>
            <h2>{{ uptime() }}</h2>
            <p>Time since the API process last started.</p>
          </div>
          <footer><span>Live</span><small>Node.js 22 LTS</small></footer>
        </article>
      </section>

      <aside class="health-note">
        <div>
          <span>Local-first</span
          ><strong>Application processes stay on macOS.</strong>
        </div>
        <p>
          PostgreSQL, Redis, MinIO and Mailpit remain isolated in Docker Compose
          for a fast development loop.
        </p>
        <a class="text-link" routerLink="/projects">Return to projects →</a>
      </aside>
    }
  `,
})
export class SystemHealthComponent implements OnInit {
  private readonly api = inject(ProjectsApiService);
  readonly health = signal<HealthResponse | null>(null);
  readonly checkedAt = signal<Date | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(false);
    this.api.getHealth().subscribe({
      next: (health) => {
        this.health.set(health);
        this.checkedAt.set(new Date());
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  dependencies() {
    const values = this.health()?.dependencies ?? {};
    return [
      {
        name: 'postgresql',
        label: 'PostgreSQL',
        description: 'Projects, immutable versions and audit metadata.',
        status: values['postgresql'] ?? 'unavailable',
      },
      {
        name: 'redis',
        label: 'Redis',
        description: 'Durable pipeline delivery and worker coordination.',
        status: values['redis'] ?? 'unavailable',
      },
    ];
  }

  uptime() {
    const seconds = this.health()?.uptimeSeconds ?? 0;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${Math.max(minutes, 1)}m`;
  }
}
