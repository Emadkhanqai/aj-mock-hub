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
});
