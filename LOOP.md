# Loop Configuration — AJ Mock Hub (Claude Code)

## Active loops

| Pattern            | Cadence | Level | Scope                                                    | Claude command                                  |
| ------------------ | ------- | ----- | -------------------------------------------------------- | ----------------------------------------------- |
| Daily Triage       | 1d      | L1    | Report project, PR, CI, dependency, and database signals | `/loop 1d Run $loop-triage and update STATE.md` |
| PR Babysitter      | 10m     | L2    | Address review and CI feedback on watched PRs            | `/loop 10m Run $pr-review-triage`               |
| CI Sweeper         | 15m     | L2    | Reproduce and minimally fix application/database CI      | `/loop 15m Run $ci-triage`                      |
| Dependency Sweeper | 6h      | L2    | Patch/minor dependency updates with full verification    | `/loop 6h Run $dependency-triage`               |

L2 means the loop may edit application functionality, tests, dependencies, lockfiles, Prisma schema, additive migrations, API, worker, Angular frontend, and documentation when the work item is approved and well scoped.

## Required execution order

1. Load `$loop-constraints` and `$loop-budget`.
2. Read the authoritative repository documents listed in `loop-constraints.md`.
3. Triage the exact work item.
4. Create an isolated task branch or worktree; never edit `main`.
5. Run `$loop-guard` with the pattern-specific ledger before every fix attempt.
6. Apply one minimal, relevant fix.
7. Run the applicable repository quality and integration gates.
8. Ask the independent `loop-verifier` to evaluate the change.
9. Commit review feedback in a new commit and update the relevant state file.
10. Push only after notifying the human; open a draft PR or update the watched PR. Never merge.

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

- Use one isolated branch/worktree per fix attempt and discard rejected attempts.
- GitHub access may read checks, issues, reviews, and comments and may push/update the dedicated task branch after notification.
- No MCP connector is required for these loops. Do not grant connectors access to private conversations, credentials, cloud resources, or customer documents.
- Follow `docs/safety.md` for tool scope and absolute prohibitions.

## Budget

- Follow `loop-budget.md`; early-exit when nothing is actionable.
- Maximum sub-agent spawns: 0 for L1 and 2 for L2.
- Maximum automated draft PRs: 2 per day.

## References

- [Loop Engineering](https://github.com/cobusgreyling/loop-engineering)
- [Daily triage](https://github.com/cobusgreyling/loop-engineering/blob/main/patterns/daily-triage.md)
- [PR babysitter](https://github.com/cobusgreyling/loop-engineering/blob/main/patterns/pr-babysitter.md)
- [CI sweeper](https://github.com/cobusgreyling/loop-engineering/blob/main/patterns/ci-sweeper.md)
- [Dependency sweeper](https://github.com/cobusgreyling/loop-engineering/blob/main/patterns/dependency-sweeper.md)
