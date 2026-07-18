import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectResponse } from '@aj-mock-hub/contracts';
import { ProjectsApiService } from '../core/projects-api.service';

@Component({
  selector: 'app-project-dashboard',
  imports: [DatePipe, RouterLink],
  template: `
    <header class="page-header">
      <div>
        <p class="eyebrow">Project workspace</p>
        <h1>Projects</h1>
        <p class="lede">Shape an idea, then preserve every revision.</p>
      </div>
      <a class="button" routerLink="/projects/new">New project</a>
    </header>

    @if (loading()) {
      <section class="state" aria-live="polite">Loading projects…</section>
    } @else if (error()) {
      <section class="state error" role="alert">
        <h2>Projects could not be loaded</h2>
        <p>Check that the API and local database are running.</p>
        <button class="button secondary" type="button" (click)="load()">
          Try again
        </button>
      </section>
    } @else if (projects().length === 0) {
      <section class="state empty">
        <span class="state-number">00</span>
        <h2>Start with a project</h2>
        <p>
          A project holds the brief. Immutable versions preserve how it evolves.
        </p>
        <a class="text-link" routerLink="/projects/new"
          >Create the first project →</a
        >
      </section>
    } @else {
      <section class="project-grid" aria-label="Projects">
        @for (project of projects(); track project.id; let index = $index) {
          <a class="project-card" [routerLink]="['/projects', project.id]">
            <span class="card-index">{{
              (index + 1).toString().padStart(2, '0')
            }}</span>
            <div>
              <h2>{{ project.name }}</h2>
              <p>{{ project.description || 'No description provided.' }}</p>
            </div>
            <footer>
              <span>{{ project.status }}</span>
              <time [dateTime]="project.updatedAt"
                >Updated {{ project.updatedAt | date: 'mediumDate' }}</time
              >
            </footer>
          </a>
        }
      </section>
    }
  `,
})
export class ProjectDashboardComponent implements OnInit {
  private readonly api = inject(ProjectsApiService);
  readonly projects = signal<ProjectResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(false);
    this.api.listProjects().subscribe({
      next: ({ items }) => {
        this.projects.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
