import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProjectsApiService } from './projects-api.service';

describe('ProjectsApiService', () => {
  let service: ProjectsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProjectsApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ProjectsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the project API for listing projects', () => {
    service
      .listProjects()
      .subscribe((response) => expect(response.items).toEqual([]));
    const request = http.expectOne('/api/projects');
    expect(request.request.method).toBe('GET');
    request.flush({ items: [] });
  });

  it('reads live dependency health from the API', () => {
    service
      .getHealth()
      .subscribe((response) => expect(response.status).toBe('ok'));
    const request = http.expectOne('/api/health');
    expect(request.request.method).toBe('GET');
    request.flush({
      service: 'api',
      status: 'ok',
      dependencies: { postgresql: 'ok', redis: 'ok' },
      uptimeSeconds: 90,
    });
  });

  it('sends a version snapshot to the nested project resource', () => {
    service
      .createVersion('project-id', {
        label: 'Revision 1',
        instructionsSnapshot: 'Use a concise dashboard.',
      })
      .subscribe();
    const request = http.expectOne('/api/projects/project-id/versions');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      label: 'Revision 1',
      instructionsSnapshot: 'Use a concise dashboard.',
    });
    request.flush({});
  });

  it('lists and cancels pipeline jobs through the existing job API', () => {
    service
      .listPipelineJobs('project-id', 'version-id')
      .subscribe((response) => expect(response.items).toEqual([]));
    const list = http.expectOne(
      '/api/projects/project-id/versions/version-id/jobs',
    );
    expect(list.request.method).toBe('GET');
    list.flush({ items: [] });

    service.cancelPipelineJob('project-id', 'job-id').subscribe();
    const cancel = http.expectOne(
      '/api/projects/project-id/jobs/job-id/cancel',
    );
    expect(cancel.request.method).toBe('POST');
    expect(cancel.request.body).toEqual({});
    cancel.flush({});
  });
});
