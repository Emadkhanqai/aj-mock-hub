# Loop State — AJ Mock Hub

Last run: 2026-07-19 (automations active)

## Active loops

### Daily Triage

- L1 report-only; `aj-mock-hub-daily-triage` is ACTIVE.

### PR Babysitter

- L2 assisted; `aj-mock-hub-pr-babysitter` is ACTIVE and exits early when no external PR exists.

### CI Sweeper

- L2 assisted; `aj-mock-hub-ci-sweeper` is ACTIVE for direct verified fixes to `main`.

### Dependency Sweeper

- L2 assisted; `aj-mock-hub-dependency-sweeper` is ACTIVE for compatible verified updates.

## High Priority (loop is acting or waiting on human)

- Milestone 6 preview and revision work is the next roadmap capability.

## Watch List

- Existing dependency advisories are tracked in `dependency-sweeper-state.md`.
- Existing dependency advisories have no safe automatic resolution yet; the Prisma recommendation is a human-gated major downgrade.
- MinIO is not running locally because workstation port 9000 is occupied; PostgreSQL, Redis, and Mailpit are healthy.

## Recent Noise (ignored this run)

- PR #6 and PR #7 were merged after explicit approval; the open PR list is empty.

## Human gates

- Automation activation and higher official pattern budgets were explicitly approved on 2026-07-19.
- Destructive migrations, credentials, major upgrades, and architecture changes require human approval.

## Budget

- Conservative caps and the `loop-pause-all` kill switch are defined in `loop-budget.md`.

---

Run log: Milestone 5 and Loop Engineering merged; no-PR direct-main policy pushed as `3deda14`; all four Codex automations created, verified, and ACTIVE.
