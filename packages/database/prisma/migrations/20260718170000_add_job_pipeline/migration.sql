CREATE TYPE "PipelineJobType" AS ENUM ('WORKSPACE_PREPARATION');
CREATE TYPE "PipelineJobStatus" AS ENUM ('QUEUED', 'ACTIVE', 'RETRYING', 'CANCEL_REQUESTED', 'CANCELLED', 'COMPLETED', 'FAILED');
CREATE TYPE "PipelineJobLogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

CREATE TABLE "pipeline_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "project_version_id" UUID NOT NULL,
    "type" "PipelineJobType" NOT NULL DEFAULT 'WORKSPACE_PREPARATION',
    "status" "PipelineJobStatus" NOT NULL DEFAULT 'QUEUED',
    "idempotency_key" VARCHAR(120) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "cancellation_requested_at" TIMESTAMPTZ(3),
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "failed_at" TIMESTAMPTZ(3),
    "error_code" VARCHAR(80),
    "error_message" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pipeline_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pipeline_jobs_idempotency_key_not_blank" CHECK (char_length(btrim("idempotency_key")) > 0),
    CONSTRAINT "pipeline_jobs_attempts_valid" CHECK ("attempts" >= 0 AND "attempts" <= "max_attempts"),
    CONSTRAINT "pipeline_jobs_max_attempts_valid" CHECK ("max_attempts" BETWEEN 1 AND 10)
);

CREATE TABLE "pipeline_job_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "level" "PipelineJobLogLevel" NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pipeline_job_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pipeline_job_logs_sequence_positive" CHECK ("sequence" > 0),
    CONSTRAINT "pipeline_job_logs_message_not_blank" CHECK (char_length(btrim("message")) > 0)
);

CREATE UNIQUE INDEX "pipeline_jobs_version_idempotency_key" ON "pipeline_jobs"("project_version_id", "idempotency_key");
CREATE INDEX "pipeline_jobs_project_created_at_idx" ON "pipeline_jobs"("project_id", "created_at" DESC);
CREATE INDEX "pipeline_jobs_status_created_at_idx" ON "pipeline_jobs"("status", "created_at");
CREATE UNIQUE INDEX "pipeline_job_logs_job_sequence_key" ON "pipeline_job_logs"("job_id", "sequence");
CREATE INDEX "pipeline_job_logs_job_created_at_idx" ON "pipeline_job_logs"("job_id", "created_at");

ALTER TABLE "pipeline_jobs" ADD CONSTRAINT "pipeline_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pipeline_jobs" ADD CONSTRAINT "pipeline_jobs_project_version_id_fkey" FOREIGN KEY ("project_version_id") REFERENCES "project_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pipeline_job_logs" ADD CONSTRAINT "pipeline_job_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "pipeline_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
