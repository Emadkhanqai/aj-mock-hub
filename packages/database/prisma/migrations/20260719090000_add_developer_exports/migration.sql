CREATE TABLE "developer_exports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "project_version_id" UUID NOT NULL,
  "storage_key" VARCHAR(500) NOT NULL,
  "file_name" VARCHAR(180) NOT NULL,
  "content_hash" CHAR(64) NOT NULL,
  "byte_size" INTEGER NOT NULL,
  "file_count" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "developer_exports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "developer_exports_byte_size_positive" CHECK ("byte_size" > 0),
  CONSTRAINT "developer_exports_file_count_positive" CHECK ("file_count" > 0)
);

CREATE TABLE "export_download_audits" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "export_id" UUID NOT NULL,
  "downloaded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "export_download_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "developer_exports_storage_key_key" ON "developer_exports"("storage_key");
CREATE INDEX "developer_exports_project_created_at_idx" ON "developer_exports"("project_id", "created_at" DESC);
CREATE INDEX "developer_exports_version_created_at_idx" ON "developer_exports"("project_version_id", "created_at" DESC);
CREATE INDEX "export_download_audits_export_downloaded_at_idx" ON "export_download_audits"("export_id", "downloaded_at" DESC);

ALTER TABLE "developer_exports" ADD CONSTRAINT "developer_exports_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "developer_exports" ADD CONSTRAINT "developer_exports_project_version_id_fkey"
FOREIGN KEY ("project_version_id") REFERENCES "project_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "export_download_audits" ADD CONSTRAINT "export_download_audits_export_id_fkey"
FOREIGN KEY ("export_id") REFERENCES "developer_exports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_developer_export_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Developer exports are immutable' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "developer_exports_immutable"
BEFORE UPDATE OR DELETE ON "developer_exports"
FOR EACH ROW EXECUTE FUNCTION prevent_developer_export_mutation();
