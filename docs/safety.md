# Loop Engineering safety policy

## Purpose

AJ Mock Hub uses Loop Engineering for supervised, fix-capable maintenance. The loops are allowed to change real application functionality, dependencies, tests, and safe database artifacts; they are not limited to reporting.

Repository authority remains, in order: explicit user instructions, `AGENTS.md`, the authoritative documents listed there, and the active loop state. A loop must stop when its proposed action conflicts with that authority.

## Allowed L2 actions

For an approved and well-scoped work item, PR Babysitter, CI Sweeper, and Dependency Sweeper may:

- Edit Angular frontend, NestJS API, worker, shared packages, tests, and documentation.
- Update compatible patch or minor dependencies and committed npm lockfiles.
- Keep `nx` and every `@nx/*` package exactly aligned.
- Edit Prisma schema and create additive migrations after reviewing generated SQL.
- Fix seed, migration, integration, and application failures using synthetic test data.
- Commit and push a dedicated task or watched PR branch after notifying the human.
- Open or update a draft pull request with complete quality-gate evidence.

## Human gates

Stop and request approval before:

- Destructive migrations, data loss, production database access, or migration-history rewrites.
- Major dependency upgrades or changes affecting licensing, cost, privacy, security policy, or architecture.
- Creating or rotating credentials, changing paid/cloud resources, or accessing private/customer data.
- Force-pushing, deleting branches, closing work items, or merging a pull request.

## Absolute prohibitions

- Never work directly on `main`.
- Never weaken, skip, or delete tests merely to obtain a passing result.
- Never commit secrets, `.env` files, customer content, generated workspaces, uploads, exports, caches, dependencies, build output, or coverage.
- Never run generated or untrusted code on the host.
- Never mount the Docker socket into an application or generated project.
- Never use privileged containers or expose host credentials, SSH keys, or a home directory.
- Never apply destructive Git or database commands without explicit approval.

## Tool and connector scope

- Local filesystem access is limited to this repository and isolated task worktrees.
- Shell commands are limited to repository inspection, repository-local npm/Nx tools, Docker Compose checks, tests, builds, migrations against isolated local data, and Git operations required by the supervised workflow.
- GitHub access is limited to this repository's branches, pull requests, reviews, comments, and CI checks.
- No MCP connector is required for the configured loops. If one is introduced later, grant only the minimum read/write scope needed for the active task and do not expose unrelated services or conversations.
- Network access is limited to package metadata, dependency downloads, GitHub delivery, and task-approved provider checks.

## Circuit breaker and verification

- Run the pattern-specific ledger check before each fix attempt.
- Stop after three failed attempts on the same item or whenever `loop-context` returns exit code 2.
- One independent verifier must run the applicable checks and approve the exact diff.
- Required repository gates are `npm ci`, formatting check, lint, tests, `CI=1` build, and relevant integration, migration, and security checks.
- A passing loop may prepare and push a branch, but only the supervisor may approve merging it.
