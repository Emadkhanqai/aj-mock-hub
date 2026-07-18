import 'dotenv/config';

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is required for integration tests');
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.PIPELINE_QUEUE_NAME = 'aj-mock-hub-pipeline-test';
process.env.WORKSPACE_ROOT = `/tmp/aj-mock-hub-worker-test-${process.pid}`;
