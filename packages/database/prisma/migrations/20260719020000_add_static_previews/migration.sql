CREATE TABLE "static_previews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "project_version_id" UUID NOT NULL,
    "source_job_id" UUID NOT NULL,
    "storage_prefix" VARCHAR(500) NOT NULL,
    "entry_file" VARCHAR(120) NOT NULL DEFAULT 'index.html',
    "content_hash" CHAR(64) NOT NULL,
    "file_count" INTEGER NOT NULL,
    "total_bytes" INTEGER NOT NULL,
    "published_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "static_previews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "static_previews_file_count_positive" CHECK ("file_count" > 0),
    CONSTRAINT "static_previews_total_bytes_positive" CHECK ("total_bytes" > 0),
    CONSTRAINT "static_previews_entry_file_safe" CHECK (
      "entry_file" = 'index.html'
    )
);

CREATE UNIQUE INDEX "static_previews_project_version_id_key"
ON "static_previews"("project_version_id");

CREATE INDEX "static_previews_source_job_id_idx"
ON "static_previews"("source_job_id");

CREATE INDEX "static_previews_storage_prefix_idx"
ON "static_previews"("storage_prefix");

CREATE INDEX "static_previews_project_published_at_idx"
ON "static_previews"("project_id", "published_at" DESC);

ALTER TABLE "static_previews"
ADD CONSTRAINT "static_previews_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "static_previews"
ADD CONSTRAINT "static_previews_project_version_id_fkey"
FOREIGN KEY ("project_version_id") REFERENCES "project_versions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "static_previews"
ADD CONSTRAINT "static_previews_source_job_id_fkey"
FOREIGN KEY ("source_job_id") REFERENCES "pipeline_jobs"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_static_preview_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Published static previews are immutable'
        USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "static_previews_immutable"
BEFORE UPDATE OR DELETE ON "static_previews"
FOR EACH ROW EXECUTE FUNCTION prevent_static_preview_mutation();

ALTER TYPE "ProjectVersionSourceType" ADD VALUE 'REVISION';
ALTER TYPE "ProjectVersionSourceType" ADD VALUE 'DUPLICATE';
ALTER TYPE "ProjectVersionSourceType" ADD VALUE 'RESTORE';
ALTER TYPE "PipelineJobType" ADD VALUE 'TARGETED_REVISION';

CREATE TYPE "DraftRevisionStatus" AS ENUM (
  'VALIDATING',
  'READY',
  'ACCEPTED',
  'DISCARDED',
  'FAILED'
);

CREATE TABLE "draft_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "base_project_version_id" UUID NOT NULL,
    "accepted_project_version_id" UUID,
    "pipeline_job_id" UUID NOT NULL,
    "status" "DraftRevisionStatus" NOT NULL DEFAULT 'VALIDATING',
    "instruction" VARCHAR(2000) NOT NULL,
    "replacement_text" VARCHAR(120) NOT NULL,
    "target_page_id" VARCHAR(120) NOT NULL,
    "target_element_id" VARCHAR(240) NOT NULL,
    "target_element_type" VARCHAR(80) NOT NULL,
    "target_file" VARCHAR(240) NOT NULL,
    "target_label" VARCHAR(240) NOT NULL,
    "specification_content" JSONB,
    "preview_storage_prefix" VARCHAR(500),
    "preview_content_hash" CHAR(64),
    "preview_file_count" INTEGER,
    "preview_total_bytes" INTEGER,
    "error_message" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "draft_revisions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "draft_revisions_instruction_not_blank" CHECK (char_length(btrim("instruction")) > 0),
    CONSTRAINT "draft_revisions_replacement_not_blank" CHECK (char_length(btrim("replacement_text")) > 0),
    CONSTRAINT "draft_revisions_target_not_blank" CHECK (
      char_length(btrim("target_page_id")) > 0 AND
      char_length(btrim("target_element_id")) > 0 AND
      char_length(btrim("target_element_type")) > 0 AND
      char_length(btrim("target_file")) > 0
    ),
    CONSTRAINT "draft_revisions_acceptance_consistent" CHECK (
      ("status" = 'ACCEPTED' AND "accepted_project_version_id" IS NOT NULL) OR
      ("status" <> 'ACCEPTED' AND "accepted_project_version_id" IS NULL)
    ),
    CONSTRAINT "draft_revisions_preview_consistent" CHECK (
      ("status" IN ('READY', 'ACCEPTED') AND
       "specification_content" IS NOT NULL AND
       "preview_storage_prefix" IS NOT NULL AND
       "preview_content_hash" IS NOT NULL AND
       "preview_file_count" > 0 AND
       "preview_total_bytes" > 0) OR
      "status" NOT IN ('READY', 'ACCEPTED')
    )
);

CREATE UNIQUE INDEX "draft_revisions_accepted_version_id_key"
ON "draft_revisions"("accepted_project_version_id");
CREATE UNIQUE INDEX "draft_revisions_pipeline_job_id_key"
ON "draft_revisions"("pipeline_job_id");
CREATE INDEX "draft_revisions_project_created_at_idx"
ON "draft_revisions"("project_id", "created_at" DESC);
CREATE INDEX "draft_revisions_base_version_created_at_idx"
ON "draft_revisions"("base_project_version_id", "created_at" DESC);

ALTER TABLE "draft_revisions" ADD CONSTRAINT "draft_revisions_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "draft_revisions" ADD CONSTRAINT "draft_revisions_base_version_id_fkey"
FOREIGN KEY ("base_project_version_id") REFERENCES "project_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "draft_revisions" ADD CONSTRAINT "draft_revisions_accepted_version_id_fkey"
FOREIGN KEY ("accepted_project_version_id") REFERENCES "project_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "draft_revisions" ADD CONSTRAINT "draft_revisions_pipeline_job_id_fkey"
FOREIGN KEY ("pipeline_job_id") REFERENCES "pipeline_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
