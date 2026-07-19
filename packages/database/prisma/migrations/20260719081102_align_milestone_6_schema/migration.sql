-- RenameForeignKey
ALTER TABLE "draft_revisions" RENAME CONSTRAINT "draft_revisions_accepted_version_id_fkey" TO "draft_revisions_accepted_project_version_id_fkey";

-- RenameForeignKey
ALTER TABLE "draft_revisions" RENAME CONSTRAINT "draft_revisions_base_version_id_fkey" TO "draft_revisions_base_project_version_id_fkey";
