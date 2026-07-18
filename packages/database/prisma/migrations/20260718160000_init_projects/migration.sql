CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE');
CREATE TYPE "ProjectVersionStatus" AS ENUM ('DRAFT');
CREATE TYPE "ProjectVersionSourceType" AS ENUM ('MANUAL');

CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000),
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "projects_name_not_blank" CHECK (char_length(btrim("name")) > 0)
);

CREATE TABLE "project_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "status" "ProjectVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "source_type" "ProjectVersionSourceType" NOT NULL DEFAULT 'MANUAL',
    "instructions_snapshot" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_versions_version_number_positive" CHECK ("version_number" > 0),
    CONSTRAINT "project_versions_label_not_blank" CHECK (char_length(btrim("label")) > 0),
    CONSTRAINT "project_versions_instructions_not_blank" CHECK (char_length(btrim("instructions_snapshot")) > 0)
);

CREATE INDEX "projects_created_at_idx" ON "projects"("created_at" DESC);
CREATE UNIQUE INDEX "project_versions_project_id_version_number_key" ON "project_versions"("project_id", "version_number");

ALTER TABLE "project_versions"
ADD CONSTRAINT "project_versions_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_project_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Accepted project versions are immutable'
        USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "project_versions_immutable"
BEFORE UPDATE OR DELETE ON "project_versions"
FOR EACH ROW EXECUTE FUNCTION prevent_project_version_mutation();
