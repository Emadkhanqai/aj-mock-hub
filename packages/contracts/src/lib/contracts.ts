export interface HealthResponse {
  service: 'api' | 'worker';
  status: 'ok' | 'degraded';
  dependencies?: Record<string, 'ok' | 'unavailable'>;
  uptimeSeconds?: number;
}
