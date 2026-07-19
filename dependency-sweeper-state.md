# Dependency Sweeper State — AJ Mock Hub

Last run: 2026-07-19 (manual supervised Codex L2 audit)
Status: L2 assisted; patch/minor changes require verifier and full gates

## Watched manifests

- Root `package.json` and `package-lock.json`
- npm workspace manifests under `apps/*` and `packages/*`
- Controlled Angular starter `package.json` and `package-lock.json`
- Pinned Docker image versions

## Alignment groups

- `nx` and every `@nx/*` package must remain exactly aligned.
- Angular framework/build packages must remain on one compatible release line.
- Prisma CLI, Client, and PostgreSQL adapter must remain compatible.
- Node remains on major version 22 unless an architecture decision approves a change.

## Human decisions and denylist

- Major version upgrades always require human approval.
- Do not automatically change authentication, payment, cloud, or security-critical dependencies.
- Patch/minor upgrades may be proposed one coherent compatibility group at a time.

## In flight / recent

- `npm audit`: 12 total advisories (1 low, 11 moderate, 0 high, 0 critical).
- Production classification: 3 moderate (`prisma` direct; `@prisma/dev` and `@hono/node-server` transitive).
- Development-only classification: 9 (4 direct and 5 transitive).
- Direct classification overall: 5 (`prisma`, `@nx/angular`, `@nx/web`, `@nx/webpack`, and `webpack-dev-server`).
- Transitive classification overall: 7.
- The advertised Prisma resolution is a major-version downgrade from 7.x to 6.x, so it remains human-gated. No `npm audit fix` was run and no dependency was changed during loop configuration.
