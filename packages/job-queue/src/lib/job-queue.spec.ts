import {
  ISOLATED_BUILD_JOB,
  TARGETED_REVISION_JOB,
  PIPELINE_JOB_OPTIONS,
  PIPELINE_QUEUE_NAME,
} from './job-queue';

describe('job queue contract', () => {
  it('uses bounded retries and a stable queue name', () => {
    expect(PIPELINE_QUEUE_NAME).toBe('aj-mock-hub-pipeline');
    expect(ISOLATED_BUILD_JOB).toBe('isolated-build');
    expect(TARGETED_REVISION_JOB).toBe('targeted-revision');
    expect(PIPELINE_JOB_OPTIONS.attempts).toBe(3);
    expect(PIPELINE_JOB_OPTIONS.backoff).toEqual({
      type: 'exponential',
      delay: 1000,
    });
  });
});
