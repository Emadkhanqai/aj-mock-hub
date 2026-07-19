# AJ Mock Hub operations

## Health and observability

`GET /api/health` reports API status, uptime, PostgreSQL readiness, and Redis readiness. Docker Compose health checks remain authoritative for PostgreSQL, Redis, MinIO, and Mailpit. Pipeline jobs retain bounded structured logs, attempts, timestamps, safe error codes, and cancellation state; exports retain append-only download audits.

Local triage order: check `docker compose ps`, call `/api/health`, inspect the affected job log, then retry with the same idempotency key for dispatch failures. Generated validation is bounded to three attempts and never runs on the host.

## Resource limits

Disposable Angular builders run without networking, privilege, a home mount, or Docker socket access. They use a read-only root, non-root UID, 1 CPU, 1 GB memory, 256 processes, 64 MB shared memory, a 300-second timeout, and forced cleanup. Preview and export collectors reject symlinks, traversal, excessive file counts, and oversized content.

## Retention policy

- Accepted versions, approved specifications, published preview metadata, export metadata, and download audits are immutable business records.
- Draft revision workspaces may be removed 7 days after `DISCARDED` or `FAILED`.
- Preview staging directories are temporary and may be removed after publication or failure.
- Orphaned MinIO objects should be expired after 30 days by a bucket lifecycle rule; referenced preview and export prefixes must be retained.
- Uploaded requirements and accepted source retention needs a business/legal decision before automation.

Cleanup automation must default to dry-run, resolve every path below `storage/workspaces/<project-id>`, and never follow symlinks. Production retention remains disabled until authentication, tenant boundaries, legal retention, and backup policy are approved.

## Failure recovery

Queue dispatch failures are safe to retry with the same idempotency key. Worker execution retries are bounded by BullMQ. A failed draft cannot be accepted, a failed generation cannot publish a preview, and a failed export upload cannot create database metadata. PostgreSQL is the source of truth; orphaned object cleanup is deferred to the retention job rather than silently changing an accepted record.
