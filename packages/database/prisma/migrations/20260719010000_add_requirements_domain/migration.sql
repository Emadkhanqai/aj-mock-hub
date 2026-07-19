CREATE TYPE "RequirementDocumentStatus" AS ENUM ('UPLOADED', 'EXTRACTED', 'FAILED');
CREATE TYPE "UiSpecificationStatus" AS ENUM ('DRAFT', 'APPROVED');

CREATE TABLE "requirement_documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "project_version_id" UUID NOT NULL,
  "original_name" VARCHAR(255) NOT NULL,
  "media_type" VARCHAR(100) NOT NULL,
  "byte_size" INTEGER NOT NULL,
  "storage_key" VARCHAR(500) NOT NULL,
  "extracted_text_key" VARCHAR(500),
  "status" "RequirementDocumentStatus" NOT NULL DEFAULT 'UPLOADED',
  "error_message" VARCHAR(500),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "requirement_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "requirement_documents_byte_size_check" CHECK ("byte_size" > 0 AND "byte_size" <= 10485760),
  CONSTRAINT "requirement_documents_media_type_check" CHECK ("media_type" IN ('text/plain', 'text/markdown', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))
);

CREATE TABLE "ui_specifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "project_version_id" UUID NOT NULL,
  "status" "UiSpecificationStatus" NOT NULL DEFAULT 'DRAFT',
  "content" JSONB NOT NULL,
  "approved_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ui_specifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ui_specifications_content_object_check" CHECK (jsonb_typeof("content") = 'object'),
  CONSTRAINT "ui_specifications_approval_check" CHECK (("status" = 'DRAFT' AND "approved_at" IS NULL) OR ("status" = 'APPROVED' AND "approved_at" IS NOT NULL))
);

CREATE UNIQUE INDEX "requirement_documents_storage_key_key" ON "requirement_documents"("storage_key");
CREATE INDEX "requirement_documents_version_created_at_idx" ON "requirement_documents"("project_version_id", "created_at");
CREATE UNIQUE INDEX "ui_specifications_project_version_id_key" ON "ui_specifications"("project_version_id");
CREATE INDEX "ui_specifications_project_created_at_idx" ON "ui_specifications"("project_id", "created_at" DESC);

ALTER TABLE "requirement_documents" ADD CONSTRAINT "requirement_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "requirement_documents" ADD CONSTRAINT "requirement_documents_project_version_id_fkey" FOREIGN KEY ("project_version_id") REFERENCES "project_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ui_specifications" ADD CONSTRAINT "ui_specifications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ui_specifications" ADD CONSTRAINT "ui_specifications_project_version_id_fkey" FOREIGN KEY ("project_version_id") REFERENCES "project_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION reject_approved_ui_specification_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'APPROVED' THEN
    RAISE EXCEPTION 'approved UI specifications are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ui_specifications_reject_approved_update"
BEFORE UPDATE ON "ui_specifications"
FOR EACH ROW EXECUTE FUNCTION reject_approved_ui_specification_mutation();

CREATE TRIGGER "ui_specifications_reject_approved_delete"
BEFORE DELETE ON "ui_specifications"
FOR EACH ROW EXECUTE FUNCTION reject_approved_ui_specification_mutation();
