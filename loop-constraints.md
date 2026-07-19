# Loop Constraints

> Add rules below with `/constraints <rule>` in your agent.
> The `loop-constraints` skill reads this file at the start of every run.
> Constraints here are **binding** — the agent MUST follow them.

## Push & Delivery

- Work directly on `main`; do not create branches or pull requests
- After all applicable gates and independent verification pass, commit and push directly to `main` without waiting for routine approval
- Never force-push, rewrite published history, or push a partial/unverified change
- Exit without editing if the working tree contains unexplained changes or another automation is active

## Paths

- Never edit .env, .env.\*, auth/, payments/, secrets/, credentials/
- Never edit infrastructure configs without human approval
- Never commit uploads, generated workspaces, previews, exports, build output, coverage, dependencies, customer data, private conversations, prompts, or credentials

## Code

- Before any task, read AGENTS.md, docs/product-brief.md, docs/roadmap.md, docs/autonomous-execution.md, docs/quality-gates.md, and relevant entries in docs/decisions.md
- Use Node.js 22 LTS, npm workspaces, and repository-local tools
- Always run tests before proposing a fix
- Never disable tests to make CI green
- Never refactor unrelated code — one fix per run
- Max 3 fix attempts per item; escalate after
- Enforce the attempt limit mechanically: log each try to `loop-ledgers/<pattern>.json` and run `loop-context --check` before retrying (see the `loop-guard` skill)
- L2 loops may edit application functionality, dependencies, lockfiles, Prisma schema, additive migrations, tests, API, worker, Angular frontend, and documentation for approved, well-scoped work
- Destructive migrations, data loss, credentials, paid services, security changes, major dependency upgrades, and architecture changes remain human decisions

## Communication

- Notify me after every successful direct push and immediately when blocked or escalated
- Never close an issue without my approval

## Budget

- If token spend hits 80% of daily cap, switch to report-only
- If loop-pause-all is active, exit immediately

---

<!-- Add your own rules below. Use plain English. The loop reads this verbatim. -->
