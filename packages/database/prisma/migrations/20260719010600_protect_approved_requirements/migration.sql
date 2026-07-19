CREATE OR REPLACE FUNCTION reject_approved_requirement_document_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  version_id uuid;
BEGIN
  version_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.project_version_id ELSE NEW.project_version_id END;
  IF EXISTS (
    SELECT 1
    FROM ui_specifications
    WHERE project_version_id = version_id
      AND status = 'APPROVED'
  ) THEN
    RAISE EXCEPTION 'documents for an approved UI specification are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER requirement_documents_reject_approved_mutation
BEFORE INSERT OR UPDATE OR DELETE ON requirement_documents
FOR EACH ROW
EXECUTE FUNCTION reject_approved_requirement_document_mutation();
