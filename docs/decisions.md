# Architecture decisions

## Approved foundation

AJ Mock Hub is an Angular-only, local-first application. The repository is an integrated Nx monorepo containing an Angular frontend, a NestJS API, a separate NestJS worker, and shared packages. npm workspaces provide package management.

## Node.js 22 LTS

The repository pins Node.js 22 because it is an active long-term-support line with a more conservative compatibility surface than the locally installed Node 24 release. `.nvmrc`, `package.json` engines, future Dockerfiles, and project documentation must remain on the same Node 22 major version. Developers may keep other system Node versions installed.

## Local applications outside Docker

During normal development, the Angular frontend and NestJS processes run directly on macOS. This keeps file watching, debugging, dependency installation, and editor integration fast and transparent. Docker Compose is limited to PostgreSQL, Redis, MinIO, and Mailpit, which gives the team reproducible stateful dependencies without containerizing the inner development loop.

## Future isolated builds

Generated projects are untrusted inputs. A later milestone will build each generated Angular application in a disposable, constrained container with controlled resources, time limits, restricted networking, and no host Docker socket mounted inside it. Milestone 1 neither builds nor executes generated code.

## Local-to-Azure mapping

| Local component            | Intended Azure direction                                  |
| -------------------------- | --------------------------------------------------------- |
| PostgreSQL                 | Azure Database for PostgreSQL Flexible Server             |
| Redis                      | Azure Managed Redis                                       |
| MinIO object storage       | Azure Blob Storage                                        |
| Mailpit                    | Azure Communication Services or an approved mail provider |
| NestJS API                 | Azure Container Apps or App Service                       |
| NestJS worker              | Azure Container Apps Jobs or a worker Container App       |
| Disposable build container | Azure Container Apps Jobs or Azure Container Instances    |

The application will depend on abstractions and environment configuration rather than local service-specific assumptions where practical. No Azure integration is implemented in Milestone 1.

## Projects and immutable versions

Projects use database-generated UUIDs and UTC `timestamptz` values. A project is the durable container for an idea; a project version is an immutable snapshot of revision instructions. Version numbers are allocated sequentially per project inside a transaction that locks the parent project row. PostgreSQL also enforces uniqueness on `(project_id, version_number)` and a trigger rejects every update or deletion of a version.

The MVP statuses are intentionally narrow (`ACTIVE` for projects and `DRAFT`/`MANUAL` for versions). Expanding lifecycle states requires a later product decision instead of speculative schema fields now.

## API validation and errors

NestJS validates transport DTOs with an allowlist, rejects unknown properties, trims accepted text, and converts validation failures into a stable error envelope. Internal exception details, SQL, and credentials are not returned to clients. Resource lookups return `404`; conflicts such as an allocation collision return `409`.

## Job pipeline

PostgreSQL is the source of truth for pipeline lifecycle and bounded append-only logs; BullMQ and Redis provide delivery, delayed retries, and worker coordination. Jobs are anchored to immutable project versions. A unique `(project_version_id, idempotency_key)` constraint prevents duplicate orchestration records, and the same database identifier is used as the BullMQ job identifier.

The only Milestone 3 job type is trusted workspace preparation. It creates empty directories through the path-confined storage abstraction and never runs commands or generated code. Jobs receive at most three attempts with exponential backoff. Queue dispatch failures can be retried using the same idempotency key; exhausted worker failures are terminal.

Queued jobs are removed and cancelled immediately. Active work uses cooperative cancellation: the database records the request, and the worker checks it before work and before committing completion. Terminal jobs cannot be cancelled. Each job exposes at most 500 persisted log entries to keep reads and storage bounded.

Local and integration-test queues use different names. Redis is transport rather than durable product state, which keeps the future Azure Redis replacement behind the shared queue boundary.

## Deferred decisions

Later milestones will decide and implement:

- AI model providers, prompt contracts, and safety policy
- Generated Angular templates and validation standards
- Disposable builder image and container orchestration
- ZIP handoff format
- Email delivery, authentication, and authorization
- Preview hosting and retention
- Detailed Azure service selection, networking, identity, and deployment automation
- GitHub integration, which is explicitly outside the MVP
