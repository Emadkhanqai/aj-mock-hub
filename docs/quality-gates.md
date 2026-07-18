# Quality gates

## Completion rule

A task is not complete and must not be submitted for review unless every applicable gate passes. Do not hide, ignore, or relabel failures. If an approved gate is temporarily inapplicable, document the reason in the pull request and obtain supervisor agreement.

## Baseline commands

Run from a clean installation under Node.js 22 LTS:

```bash
npm ci
npm run format:check
npm run lint
npm test
CI=1 npm run build
```

Also run all relevant integration, migration, infrastructure, and security checks for the task. Record each exact command and exit status in the pull request.

## Functional correctness

- Approved behavior is implemented end to end.
- Loading, empty, populated, validation, and failure states are handled where relevant.
- Public contracts match documented request and response shapes.
- Time, ordering, concurrency, and idempotency behavior are tested when applicable.
- No deferred behavior appears as fake or inactive UI.

## Test coverage

- Unit tests cover business rules and error paths.
- Integration tests cover service boundaries such as PostgreSQL, Redis, object storage, or HTTP when introduced.
- Regression tests accompany bug fixes.
- Tests use synthetic data only.
- Tests do not depend on production services or credentials.
- Tests do not destroy developer data; isolated test databases, schemas, buckets, and queues are required.

## Database and migration safety

For database changes:

- Review the generated SQL before applying it.
- Prefer additive, reversible changes.
- Use database constraints for critical invariants where practical.
- Verify migration history and schema consistency.
- Test migrations against an isolated local database.
- Confirm seed scripts are deterministic and safe to rerun.
- Require explicit approval for destructive migrations or potential data loss.
- Never use `db push` as a substitute for committed migration history in an implemented milestone.

## Security checks

- Scan the proposed Git diff for secrets, tokens, credentials, customer data, and proprietary generated content.
- Confirm `.env`, local configuration, uploaded documents, generated workspaces, build outputs, caches, and exports remain ignored.
- Run `npm audit` and classify production versus development advisories when dependencies change.
- Do not run automated audit fixes without reviewing their dependency and compatibility impact.
- Validate inputs at trust boundaries.
- Do not expose internal errors, stack traces, queries, connection strings, or filesystem paths to users.
- Treat generated code and uploaded content as untrusted.

## Generated-code safety

When generation and build capabilities are introduced:

- Never execute generated code directly on the host.
- Never mount the Docker socket or user home directory.
- Never expose SSH keys or host credentials.
- Never use privileged containers.
- Enforce command allowlists, CPU limits, memory limits, process limits, timeouts, and restricted networking.
- Capture stdout, stderr, exit codes, and diagnostics.
- Clean up disposable containers and temporary data.
- Publish previews or accept versions only after validation succeeds.

## Architecture review

Confirm before review:

- Angular remains the only generated frontend framework.
- API, worker, database, storage, generation, and infrastructure boundaries remain clear.
- Infrastructure-specific behavior is behind interfaces.
- Generated customer source is separate from product source.
- Accepted versions are never overwritten.
- No large UI or infrastructure dependency was introduced without approval.
- The implementation contains no speculative fields or later-milestone features.

## Error handling

- Errors are consistent, actionable, and safe for users.
- Expected errors map to documented status codes or states.
- Unexpected errors are logged without exposing sensitive details.
- Retry behavior is bounded and tested where relevant.
- Partial failure does not silently produce accepted versions, previews, or exports.

## Self-review checklist

Before requesting review, explicitly inspect:

- Correctness
- Security
- Architecture boundaries
- Test coverage
- Validation
- Error handling
- Migration safety
- Immutability
- Secrets and generated-file safety
- Public-repository safety
- Scope creep
- Documentation accuracy

## Git and delivery gate

- Work is on the approved task branch, never directly on `main`.
- The diff contains only approved changes.
- Commits are cohesive and clearly named.
- The branch is pushed without force.
- The pull request contains all required evidence.
- Review feedback is addressed in new commits.
- Merge occurs only after explicit supervisor approval.
