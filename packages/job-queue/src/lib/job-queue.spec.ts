import { PIPELINE_JOB_OPTIONS, PIPELINE_QUEUE_NAME } from './job-queue';

describe('job queue contract', () => {
  it('uses bounded retries and a stable queue name', () => {
    expect(PIPELINE_QUEUE_NAME).toBe('aj-mock-hub-pipeline');
    expect(PIPELINE_JOB_OPTIONS.attempts).toBe(3);
    expect(PIPELINE_JOB_OPTIONS.backoff).toEqual({
      type: 'exponential',
      delay: 1000,
    });
  });
});
