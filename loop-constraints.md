# Loop Constraints

> Add rules below with `/constraints <rule>` in your agent.
> The `loop-constraints` skill reads this file at the start of every run.
> Constraints here are **binding** — the agent MUST follow them.

## Push & Merge

- Don't push before telling me
- Never auto-merge to main without human approval
- Always create a draft PR first; let me review before marking ready
- Never implement directly on main; use one branch per approved task

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
- Destructive migrations, data loss, credentials, paid services, security changes, major dependency upgrades, architecture changes, and merge remain human decisions

## Communication

- Always tell me what you're about to do before doing it
- Never close an issue or PR without my approval

## Budget

- If token spend hits 80% of daily cap, switch to report-only
- If loop-pause-all is active, exit immediately

---

<!-- Add your own rules below. Use plain English. The loop reads this verbatim. -->
