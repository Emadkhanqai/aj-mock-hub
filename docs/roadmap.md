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

Status: planned; implementation not yet started.

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

- BullMQ integration.
- Job state and lifecycle.
- Retry policy.
- Idempotency.
- Cancellation policy.
- Job logs.
- Workspace abstraction.

## Milestone 4 — Isolated build runner

- Controlled Angular starter template.
- Disposable builder containers.
- Approved-command allowlist.
- CPU, memory, process, timeout, and network limits.
- Captured build diagnostics.
- Guaranteed cleanup.

## Milestone 5 — Requirements and generation

- Written instructions.
- Document upload.
- Requirements extraction.
- Framework-independent UI specification.
- User correction and approval.
- Model-provider abstraction.
- Controlled file tools.
- Staged Angular generation.

## Milestone 6 — Preview and revisions

- Static preview.
- Responsive preview modes.
- Element selection.
- Targeted revisions.
- Draft, accept, and discard flow.
- Compare, restore, and duplicate versions without overwriting accepted versions.

## Milestone 7 — Developer handoff

- ZIP packaging.
- Exclusion validation.
- Artifact storage.
- Signed download links.
- Email sharing.
- Download audit trail.

## Milestone 8 — Demonstration and hardening

- Seeded demonstration flow.
- Failure recovery.
- Cleanup and retention policies.
- Security review.
- Performance and resource limits.
- Observability.
- Azure migration documentation.

## Cross-milestone invariants

Every milestone must preserve:

- Angular-only generated applications.
- Clear separation between AJ Mock Hub source and generated customer workspaces.
- Immutable accepted versions.
- No execution of generated code on the host.
- No secrets, customer data, or generated customer applications in the public repository.
- Infrastructure access through abstractions.
- Quality-gate evidence before review.
- Supervisor approval before merge.
