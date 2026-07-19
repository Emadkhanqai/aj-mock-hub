# AJ Mock Hub roadmap

## Roadmap rules

This roadmap defines delivery order and scope boundaries. A milestone may begin only when it is approved. Do not pull later capabilities forward for convenience, create placeholder implementations for them, or silently expand a milestone.

## Milestone 1 — Foundation

Status: completed.

Delivered:

- Nx workspace and npm workspaces.
- Node.js 22 LTS repository contract.
- Angular frontend shell.
- NestJS API and separate worker.
- Shared packages.
- PostgreSQL, Redis, MinIO, and Mailpit through Docker Compose.
- API and worker health endpoints.
- Repository documentation and quality gates.

## Milestone 2 — Project domain

Status: completed.

Approved scope:

- Prisma installation and PostgreSQL connectivity.
- `packages/database`.
- `Project` and `ProjectVersion` schema, migration, and seed data.
- Project create, list, and detail APIs.
- Project-version create, list, and detail APIs.
- Sequential per-project version numbers.
- Immutable project versions.
- Request validation and consistent API errors.
- Angular project dashboard.
- Angular new-project form.
- Angular project detail and version history.
- Unit and integration tests.
- README and architecture-decision updates.

Explicit exclusions:

- BullMQ or job processing.
- AI or model integration.
- Document uploads or MinIO workflows.
- ZIP export or email.
- Authentication or authorization.
- Preview hosting.
- Generated Angular templates.
- Builder containers.
- Azure implementation.
- GitHub integration.

## Milestone 3 — Job pipeline

Status: completed.

- BullMQ integration.
- Job state and lifecycle.
- Retry policy.
- Idempotency.
- Cancellation policy.
- Job logs.
- Workspace abstraction.

## Milestone 4 — Isolated build runner

Status: completed.

- Controlled Angular starter template.
- Disposable builder containers.
- Approved-command allowlist.
- CPU, memory, process, timeout, and network limits.
- Captured build diagnostics.
- Guaranteed cleanup.

## Milestone 5 — Requirements and generation

Status: completed.

- Written instructions.
- Document upload.
- Requirements extraction.
- Framework-independent UI specification.
- User correction and approval.
- Model-provider abstraction.
- Controlled file tools.
- Staged Angular generation.

## Milestone 6 — Preview and revisions

Status: completed.

Delivered:

- Static previews published only after isolated lint, test, and build succeed.
- Desktop, tablet, and mobile preview modes.
- Stable component selection with element ID, type, page, and source file.
- Controlled component-label revisions validated in disposable containers.
- Guided visual revisions for text, element colors, duplication, button creation,
  and allowlisted page themes. Every change remains a validated draft before it
  can become a new immutable version.
- Temporary draft preview, accepted-versus-draft switching, accept, and discard.
- Version comparison, restore, and duplicate operations that always create new immutable versions.

## Milestone 7 — Developer handoff

Status: completed.

Delivered:

- Deterministic clean ZIP packaging from validated immutable version source.
- Strict exclusion and size validation for dependencies, build output, caches, local environments, logs, keys, and symlinks.
- Immutable ZIP artifact metadata and private object storage in MinIO.
- HMAC-signed expiring application download links without exposing object keys or storage credentials.
- SMTP email sharing through Mailpit-compatible configuration.
- Persistent download audit records.

## Milestone 8 — Demonstration and hardening

Status: completed.

Delivered:

- Deterministic synthetic project with an approved generation-ready UI specification.
- Documented and tested bounded failure recovery and idempotent retry behavior.
- Safe cleanup/retention policy separating temporary data from immutable records.
- End-to-end security review and residual-risk register.
- Enforced builder, preview, upload, and export resource limits.
- Dependency-aware API health, job diagnostics, and download auditing.
- Actionable local-to-Azure migration runbook with approval gates.

## Cross-milestone invariants

Every milestone must preserve:

- Angular-only generated applications.
- Clear separation between AJ Mock Hub source and generated customer workspaces.
- Immutable accepted versions.
- No execution of generated code on the host.
- No secrets, customer data, or generated customer applications in the public repository.
- Infrastructure access through abstractions.
- Quality-gate evidence before every direct commit and push.
- Cohesive, non-force commits directly on `main` under the standing no-PR delivery policy.
