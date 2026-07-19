# Loop Configuration — AJ Mock Hub (Codex)

## Active loops

| Pattern            | Cadence | Level | Scope                                                    | Codex Automation prompt        |
| ------------------ | ------- | ----- | -------------------------------------------------------- | ------------------------------ |
| Daily Triage       | 1d      | L1    | Report project, PR, CI, dependency, and database signals | See `Daily Triage` below       |
| PR Babysitter      | 10m     | L2    | Address review and CI feedback on watched PRs            | See `PR Babysitter` below      |
| CI Sweeper         | 15m     | L2    | Reproduce and minimally fix application/database CI      | See `CI Sweeper` below         |
| Dependency Sweeper | 6h      | L2    | Patch/minor dependency updates with full verification    | See `Dependency Sweeper` below |

L2 means the loop may edit application functionality, tests, dependencies, lockfiles, Prisma schema, additive migrations, API, worker, Angular frontend, and documentation when the work item is approved and well scoped.

## Codex Automation prompts

Create these recurring tasks in the Codex Automations interface. Each task uses this repository as its workspace.

### Daily Triage — every day

```text
Run $loop-constraints, then $loop-budget, then $loop-triage. Read AGENTS.md and every authoritative document it requires. Inspect STATE.md, watched pull requests, recent commits, CI, dependencies, and database signals. Update STATE.md with concise High Priority, Watch, Noise, and state changes. This task is L1 report-only: do not modify application source, dependencies, or database artifacts. Record the run in loop-run-log.md and exit early when nothing is actionable.
```

### PR Babysitter — every 10 minutes

```text
Run $loop-constraints and $loop-budget, then $pr-review-triage for every pull request in pr-babysitter-state.md, especially Milestone 5 PR #6. If review feedback or CI is actionable, run $loop-guard with loop-ledgers/pr-babysitter.json, make one minimal fix in the watched branch isolated worktree, run all applicable AJ Mock Hub quality gates, and ask the verifier sub-agent from .codex/agents/verifier.toml to check the exact diff. Update the PR and state only after verifier approval. Never merge, force-push, weaken tests, or bypass a human gate. Record the run and exit early when no action is required.
```

### CI Sweeper — every 15 minutes

```text
Run $loop-constraints and $loop-budget, then $ci-triage for main and active pull-request failures. If a failure is actionable and not infrastructure or a flake, run $loop-guard with loop-ledgers/ci-sweeper.json, create an isolated task worktree, apply one minimal root-cause fix across the application, API, worker, database, migrations, generation, storage, frontend, tests, or CI configuration as required, and run the full applicable quality and integration gates. Ask the verifier sub-agent from .codex/agents/verifier.toml to approve the exact diff before pushing a draft PR or updating the watched PR. Never merge. Update ci-sweeper-state.md and loop-run-log.md; exit early when CI is green.
```

### Dependency Sweeper — every 6 hours

```text
Run $loop-constraints and $loop-budget, then $dependency-triage for every watched manifest in dependency-sweeper-state.md. For one compatible patch or minor update at a time, run $loop-guard with loop-ledgers/dependency-sweeper.json, use an isolated worktree, preserve Nx and Angular/Prisma alignment groups, update the npm lockfile, and run npm ci, formatting, lint, tests, CI build, and both full and production npm audits. Ask the verifier sub-agent from .codex/agents/verifier.toml to approve the exact diff before opening or updating a draft PR. Major upgrades, breaking fixes, licensing/security/cost changes, and destructive migrations require human approval. Never run npm audit fix automatically. Update dependency-sweeper-state.md and loop-run-log.md; exit early when no safe update exists.
```

## Required execution order

1. Load `$loop-constraints` and `$loop-budget`.
2. Read `AGENTS.md` and every authoritative document it requires.
3. Triage the exact work item and exit early if nothing is actionable.
4. Create an isolated Codex task worktree; never edit `main`.
5. Run `$loop-guard` with the pattern-specific ledger before every fix attempt.
6. Apply one minimal, relevant fix.
7. Run the applicable repository quality, integration, migration, and security gates.
8. Ask the independent verifier in `.codex/agents/verifier.toml` to evaluate the exact diff.
9. Commit review feedback in a new commit and update the relevant state and run-log files.
10. Notify the human before pushing; open a draft PR or update the watched PR. Never merge.

## Pattern ledgers

| Pattern            | Ledger                                 | State file                    |
| ------------------ | -------------------------------------- | ----------------------------- |
| PR Babysitter      | `loop-ledgers/pr-babysitter.json`      | `pr-babysitter-state.md`      |
| CI Sweeper         | `loop-ledgers/ci-sweeper.json`         | `ci-sweeper-state.md`         |
| Dependency Sweeper | `loop-ledgers/dependency-sweeper.json` | `dependency-sweeper-state.md` |

## Human gates

- Explicit approval is required for destructive migrations, data loss, credentials, paid services, security policy changes, major dependency upgrades, major architecture decisions, and merging.
- Additive database migrations, ordinary application fixes, test fixes, approved review comments, and compatible dependency patch/minor updates are actionable at L2.
- Never auto-merge, close a PR/issue, weaken tests, force-push, or expose private/customer data.
- Stop after the circuit breaker trips or the verifier rejects the same approach repeatedly.

## Worktrees and connectors

- Codex provides isolated worktrees for tasks; use one per fix attempt and discard rejected attempts.
- GitHub access may read checks, issues, reviews, and comments and may push/update the dedicated task branch after notification.
- No additional MCP connector is required for these loops. Do not grant connectors access to private conversations, credentials, cloud resources, or customer documents.
- Follow `docs/safety.md` for tool scope and absolute prohibitions.

## Budget

- Follow `loop-budget.md`; early-exit when nothing is actionable.
- Maximum sub-agent spawns: 0 for L1 and 2 for L2.
- Maximum automated draft PRs: 2 per day.

## References

- [Loop Engineering](https://github.com/cobusgreyling/loop-engineering)
- [Codex examples](https://github.com/cobusgreyling/loop-engineering/tree/main/examples/codex)
- [Codex starter](https://github.com/cobusgreyling/loop-engineering/tree/main/starters/minimal-loop-codex)
- [Daily triage](https://github.com/cobusgreyling/loop-engineering/blob/main/patterns/daily-triage.md)
- [PR babysitter](https://github.com/cobusgreyling/loop-engineering/blob/main/patterns/pr-babysitter.md)
- [CI sweeper](https://github.com/cobusgreyling/loop-engineering/blob/main/patterns/ci-sweeper.md)
- [Dependency sweeper](https://github.com/cobusgreyling/loop-engineering/blob/main/patterns/dependency-sweeper.md)
