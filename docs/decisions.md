# Architecture decisions

## Approved foundation

AJ Mock Hub is an Angular-only, local-first application. The repository is an integrated Nx monorepo containing an Angular frontend, a NestJS API, a separate NestJS worker, and shared packages. npm workspaces provide package management.

## Node.js 22 LTS

The repository pins Node.js 22 because it is an active long-term-support line with a more conservative compatibility surface than the locally installed Node 24 release. `.nvmrc`, `package.json` engines, future Dockerfiles, and project documentation must remain on the same Node 22 major version. Developers may keep other system Node versions installed.

## Local applications outside Docker

During normal development, the Angular frontend and NestJS processes run directly on macOS. This keeps file watching, debugging, dependency installation, and editor integration fast and transparent. Docker Compose is limited to PostgreSQL, Redis, MinIO, and Mailpit, which gives the team reproducible stateful dependencies without containerizing the inner development loop.

Docker service host ports are localhost-only and configurable through the ignored local environment. MinIO defaults to ports `19000` and `19001` because port `9000` is commonly occupied by local SonarQube. When a conflict occurs, the process or container owning the port is identified first and AJ Mock Hub is moved to a free localhost binding; unrelated services are not stopped automatically.

## Isolated builds

Generated projects are untrusted inputs. Every Angular validation runs in a disposable, constrained container with controlled resources, time limits, disabled networking, and no host Docker socket mounted inside it. Generated applications are never executed directly on the host.

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

## Isolated Angular validation

The controlled starter pins Angular 22.0.7 independently from the management application. A dedicated Node 22.23 builder image installs its exact lockfile once. At runtime the worker invokes the trusted host Docker CLI; neither the worker nor a generated workspace receives the Docker socket.

Input is bind-mounted read-only at `/input` and copied into an ephemeral UID-10001-owned tmpfs. The container has no network, a read-only root, no Linux capabilities, no privilege escalation, no home mount, a PID limit of 256, one CPU, 1 GiB memory, and a five-minute timeout. Only `lint`, `test`, and `build` are accepted by both the host runner and container entrypoint. Containers use `--rm`, and timeout handling names and kills the exact disposable container.

Build output remains ephemeral in Milestone 4. The worker persists bounded exit codes, durations, timeout state, and sanitized output in pipeline logs. Preview/artifact publication is deferred. Controlled template copying rejects symbolic links and excludes dependency, build, cache, and coverage directories.

## Requirements documents and UI specifications

Requirements documents belong to an immutable project version. PostgreSQL stores allowlisted media type, bounded size, lifecycle state, and opaque storage keys; MinIO stores source bytes and bounded extracted text behind the object-storage interface. Uploads allow TXT, Markdown, PDF, and DOCX only, with a 10 MB per-file limit and at most 10 documents per version. Object keys are server-generated and never derived as trusted paths from user filenames.

Each project version has at most one framework-independent UI specification. Drafts use optimistic concurrency through `updatedAt` and remain editable. Approval records an UTC timestamp and is irreversible: both API rules and a PostgreSQL trigger reject updates or deletion after approval. Angular generation requires an approved specification.

## Model provider and structured output

The generation package owns provider-neutral inputs, a strict Zod schema, and the equivalent closed JSON Schema used for Azure OpenAI structured output. The Azure deployment name and API version are environment configuration, requests have a 60-second default timeout and at most two SDK retries, and returned JSON is validated again locally before persistence. No provider credentials enter PostgreSQL, logs, generated workspaces, or the repository.

Local development defaults to a deterministic offline provider so tests and normal contributor setup have no cloud dependency or cost. Selecting `azure-openai` requires explicit credentials in the ignored local environment. This adapter does not provision or deploy Azure resources.

## Controlled staged Angular generation

The approved UI specification is transformed into a fixed allowlist of Angular project files. File paths are chosen by trusted application code, confined beneath the version workspace, and cannot contain traversal segments. User and model text is serialized as data rather than interpreted as a path or command. The worker then invokes only `lint`, `test`, and `build` through the existing disposable, network-disabled builder container; generated source is never executed on the host.

The generation stage emits an Angular application shell, responsive page navigation, selectable component placeholders, a test, the approved UI specification, and developer setup documentation.

## Static previews and draft revisions

Only the disposable builder container can produce preview files. Its validated `dist` output is copied through a dedicated writable output mount, bounded to 500 files and 25 MB, hashed, and published to a separate MinIO bucket. PostgreSQL stores immutable preview metadata; API responses never expose MinIO object keys. Preview files are served with strict content types, CSP, no-sniff, and no-referrer headers.

The management application embeds generated previews in a script-enabled sandbox without `allow-same-origin`. Preview assets permit read-only cross-origin loading for the opaque sandbox, while `connect-src 'none'` prevents generated code from making network requests. Component selection communicates only an allowlisted metadata object through `postMessage`; the parent validates the message source and fields.

Targeted changes are temporary `DraftRevision` records and never mutate their base version. The first controlled revision operation replaces one selected component label in the approved UI specification, regenerates only the trusted file set, and repeats isolated lint, test, and build. A ready draft may be discarded or accepted. Acceptance creates a sequential new immutable `ProjectVersion`, approved specification, source workspace, and static preview reference. Duplicate and restore also create new versions, and comparison is metadata/specification based.

## Deferred decisions

Later milestones will decide and implement:

- Additional model providers and model-evaluation policy
- ZIP handoff format
- Email delivery, authentication, and authorization
- Preview retention and cleanup policy
- Detailed Azure service selection, networking, identity, and deployment automation
- GitHub integration, which is explicitly outside the MVP
