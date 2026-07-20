ALTER TABLE "requirement_documents"
DROP CONSTRAINT "requirement_documents_media_type_check";

ALTER TABLE "requirement_documents"
ADD CONSTRAINT "requirement_documents_media_type_check"
CHECK (
  "media_type" IN (
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp'
  )
);
