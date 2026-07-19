import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'projects' },
  {
    path: 'projects',
    loadComponent: () =>
      import('./projects/project-dashboard.component').then(
        (module) => module.ProjectDashboardComponent,
      ),
  },
  {
    path: 'projects/new',
    loadComponent: () =>
      import('./projects/new-project.component').then(
        (module) => module.NewProjectComponent,
      ),
  },
  {
    path: 'health',
    loadComponent: () =>
      import('./system-health.component').then(
        (module) => module.SystemHealthComponent,
      ),
  },
  {
    path: 'projects/:projectId/versions/:versionId/preview',
    loadComponent: () =>
      import('./projects/preview-studio.component').then(
        (module) => module.PreviewStudioComponent,
      ),
  },
  {
    path: 'projects/:projectId/versions/:versionId',
    loadComponent: () =>
      import('./projects/version-workspace.component').then(
        (module) => module.VersionWorkspaceComponent,
      ),
  },
  {
    path: 'projects/:projectId',
    loadComponent: () =>
      import('./projects/project-detail.component').then(
        (module) => module.ProjectDetailComponent,
      ),
  },
  { path: '**', redirectTo: 'projects' },
];
