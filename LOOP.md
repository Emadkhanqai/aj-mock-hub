# Loop Configuration — AJ Mock Hub (Codex)

## Active loops

| Pattern            | Cadence | Level | Scope                                                    | Codex Automation prompt        |
| ------------------ | ------- | ----- | -------------------------------------------------------- | ------------------------------ |
| Daily Triage       | 1d      | L1    | Report project, PR, CI, dependency, and database signals | See `Daily Triage` below       |
| PR Babysitter      | 10m     | L2    | Address review and CI feedback on watched PRs            | See `PR Babysitter` below      |
| CI Sweeper         | 15m     | L2    | Reproduce and minimally fix application/database CI      | See `CI Sweeper` below         |
| Dependency Sweeper | 6h      | L2    | Patch/minor dependency updates with full verification    | See `Dependency Sweeper` below |

L2 means the loop may edit application functionality, tests, dependencies, lockfiles, Prisma schema, additive migrations, API, worker, Angular frontend, and documentation when the work item is approved and well scoped. Verified L2 changes commit and push directly to `main`; no pull request is created.

## Codex Automation prompts

Create these recurring tasks in the Codex Automations interface. Each task uses this repository as its workspace.

### Daily Triage — every day

```text
Run $loop-constraints, then $loop-budget, then $loop-triage. Read AGENTS.md and every authoritative document it requires. Inspect STATE.md, watched pull requests, recent commits, CI, dependencies, and database signals. Update STATE.md with concise High Priority, Watch, Noise, and state changes. This task is L1 report-only: do not modify application source, dependencies, or database artifacts. Record the run in loop-run-log.md and exit early when nothing is actionable.
```

### PR Babysitter — every 10 minutes

```text
Run $loop-constraints and $loop-budget, then $pr-review-triage for any open external pull request or unresolved historical review item. Do not create a pull request. If feedback is actionable, synchronize clean main, run $loop-guard with loop-ledgers/pr-babysitter.json, make one minimal fix, run all applicable AJ Mock Hub quality gates, and ask the verifier sub-agent from .codex/agents/verifier.toml to check the exact diff. After verifier approval, commit and push directly to main without force, update state, and notify the user. If no pull request or review item is actionable, exit in under 5k tokens. Never weaken tests or bypass a human gate.
```

### CI Sweeper — every 15 minutes

```text
Run $loop-constraints and $loop-budget, then $ci-triage for main failures. If a failure is actionable and not infrastructure or a flake, synchronize clean main, run $loop-guard with loop-ledgers/ci-sweeper.json, apply one minimal root-cause fix across the application, API, worker, database, migrations, generation, storage, frontend, tests, or CI configuration as required, and run the full applicable quality and integration gates. Ask the verifier sub-agent from .codex/agents/verifier.toml to approve the exact diff. After approval, commit and push directly to main without force, update ci-sweeper-state.md and loop-run-log.md, and notify the user. Do not create a pull request. Exit early when CI is green or the working tree is not clean.
```

### Dependency Sweeper — every 6 hours

```text
Run $loop-constraints and $loop-budget, then $dependency-triage for every watched manifest in dependency-sweeper-state.md. For one compatible patch or minor update at a time, synchronize clean main, run $loop-guard with loop-ledgers/dependency-sweeper.json, preserve Nx and Angular/Prisma alignment groups, update the npm lockfile, and run npm ci, formatting, lint, tests, CI build, and both full and production npm audits. Ask the verifier sub-agent from .codex/agents/verifier.toml to approve the exact diff. After approval, commit and push directly to main without force, update dependency-sweeper-state.md and loop-run-log.md, and notify the user. Do not create a pull request. Major upgrades, breaking fixes, licensing/security/cost changes, and destructive migrations require human approval. Never run npm audit fix automatically. Exit early when no safe update exists or the working tree is not clean.
```

## Required execution order

1. Load `$loop-constraints` and `$loop-budget`.
2. Read `AGENTS.md` and every authoritative document it requires.
3. Triage the exact work item and exit early if nothing is actionable.
4. Synchronize `main` and confirm the working tree is clean; exit rather than overwrite concurrent or unexplained changes.
5. Run `$loop-guard` with the pattern-specific ledger before every fix attempt.
6. Apply one minimal, relevant fix.
7. Run the applicable repository quality, integration, migration, and security gates.
8. Ask the independent verifier in `.codex/agents/verifier.toml` to evaluate the exact diff.
9. Update the relevant state and run-log files, then create one cohesive commit directly on `main`.
10. Push `main` without force and notify the user with complete evidence. Never create a pull request.

## Pattern ledgers

| Pattern            | Ledger                                 | State file                    |
| ------------------ | -------------------------------------- | ----------------------------- |
| PR Babysitter      | `loop-ledgers/pr-babysitter.json`      | `pr-babysitter-state.md`      |
| CI Sweeper         | `loop-ledgers/ci-sweeper.json`         | `ci-sweeper-state.md`         |
| Dependency Sweeper | `loop-ledgers/dependency-sweeper.json` | `dependency-sweeper-state.md` |

## Human gates

- Explicit approval is required for destructive migrations, data loss, credentials, paid services, security policy changes, major dependency upgrades, and major architecture decisions.
- Additive database migrations, ordinary application fixes, test fixes, approved review comments, and compatible dependency patch/minor updates are actionable at L2.
- Never create a PR, close an issue, weaken tests, force-push, or expose private/customer data.
- Stop after the circuit breaker trips or the verifier rejects the same approach repeatedly.

## Concurrency and connectors

- Automated runs target the local `main` checkout. If it is dirty or another run is active, exit without editing and record contention in state.
- GitHub access may read checks, issues, historical reviews, and comments and may push a verified commit directly to `main`.
- No additional MCP connector is required for these loops. Do not grant connectors access to private conversations, credentials, cloud resources, or customer documents.
- Follow `docs/safety.md` for tool scope and absolute prohibitions.

## Budget

- Follow `loop-budget.md`; early-exit when nothing is actionable.
- Maximum sub-agent spawns: 0 for L1 and 2 for L2.
- Direct commits per day are capped per pattern in `loop-budget.md`.

## References

- [Loop Engineering](https://github.com/cobusgreyling/loop-engineering)
- [Codex examples](https://github.com/cobusgreyling/loop-engineering/tree/main/examples/codex)
- [Codex starter](https://github.com/cobusgreyling/loop-engineering/tree/main/starters/minimal-loop-codex)
- [Daily triage](https://github.com/cobusgreyling/loop-engineering/blob/main/patterns/daily-triage.md)
- [PR babysitter](https://github.com/cobusgreyling/loop-engineering/blob/main/patterns/pr-babysitter.md)
- [CI sweeper](https://github.com/cobusgreyling/loop-engineering/blob/main/patterns/ci-sweeper.md)
- [Dependency sweeper](https://github.com/cobusgreyling/loop-engineering/blob/main/patterns/dependency-sweeper.md)
