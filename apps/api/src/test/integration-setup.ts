import 'dotenv/config';

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is required for integration tests');
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.PIPELINE_QUEUE_NAME = 'aj-mock-hub-pipeline-test';
process.env.EXPORT_SIGNING_SECRET =
  'integration_only_export_signing_secret_123456789';
process.env.EXPORT_LINK_TTL_SECONDS = '3600';
