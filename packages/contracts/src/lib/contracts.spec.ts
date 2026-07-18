import type { HealthResponse } from './contracts';

describe('contracts', () => {
  it('defines the shared health response', () => {
    const response: HealthResponse = { service: 'api', status: 'ok' };
    expect(response.status).toEqual('ok');
  });
});
