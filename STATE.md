# Loop State — AJ Mock Hub

Last run: 2026-07-19 (direct-main automation activation)

## Active loops

### Daily Triage

- L1 report-only; full Codex Automation activation approved.

### PR Babysitter

- L2 assisted; no pull requests are open and future delivery is direct to `main`.

### CI Sweeper

- L2 assisted; direct verified CI fixes to `main` are approved.

### Dependency Sweeper

- L2 assisted; compatible verified dependency fixes may commit directly to `main`.

## High Priority (loop is acting or waiting on human)

- Milestone 6 preview and revision work is the next roadmap capability.
- Fully activate and verify all four Codex automations.

## Watch List

- Existing dependency advisories are tracked in `dependency-sweeper-state.md`.
- Existing dependency advisories have no safe automatic resolution yet; the Prisma recommendation is a human-gated major downgrade.

## Recent Noise (ignored this run)

- PR #6 and PR #7 were merged after explicit approval; the open PR list is empty.

## Human gates

- Automation activation and higher official pattern budgets were explicitly approved on 2026-07-19.
- Destructive migrations, credentials, major upgrades, and architecture changes require human approval.

## Budget

- Conservative caps and the `loop-pause-all` kill switch are defined in `loop-budget.md`.

---

Run log: Milestone 5 and Loop Engineering PRs merged; standing no-PR direct-main policy approved; automation activation in progress.
