# Autonomous execution policy

## Purpose

This policy lets Codex continue routine implementation without repeatedly asking for ordinary engineering decisions while preserving supervised delivery, scope control, security, and explicit merge approval.

## Required reading

Before planning or implementing any task, read:

1. `AGENTS.md`
2. `docs/product-brief.md`
3. `docs/roadmap.md`
4. `docs/autonomous-execution.md`
5. `docs/quality-gates.md`
6. Relevant architecture decisions and task-specific documentation

If instructions conflict, the current explicit user instruction has highest authority, followed by `AGENTS.md`, these authoritative documents, and task-local implementation notes.

## Milestone execution loop

For every approved milestone or task:

1. Read all authoritative documents.
2. Inspect the repository and current architecture.
3. Confirm the working tree and current branch.
4. Never implement directly on `main`.
5. Create or use one dedicated branch for the approved scope.
6. State scope, exclusions, risks, and assumptions.
7. Produce a concise implementation plan.
8. Implement incrementally and only within approved scope.
9. Add proportionate tests and documentation.
10. Run every required quality, integration, migration, and security check.
11. Perform the required self-review.
12. Commit cohesive changes.
13. Push the milestone branch.
14. Open or update a pull request with complete evidence.
15. Wait for supervisor review before merge.
16. Address every review comment in a new commit.
17. Never merge without explicit approval.
18. After approval and merge, begin only the next approved milestone.

## Routine decisions Codex may make

Codex should continue without pausing for ordinary decisions including:

- Internal naming consistent with repository conventions.
- File placement within the approved architecture.
- Test organization and fixtures.
- Styling details within the established design language.
- Validation details that preserve approved business behavior.
- Error-handling implementation that follows the documented error contract.
- Small reversible refactors required by the approved change.
- Documentation wording and command organization.

These decisions must not change product behavior, security posture, cost, public API commitments, or milestone boundaries.

## Stop conditions

Stop and request user input only when:

- Business behavior is genuinely ambiguous.
- Two materially different product options exist.
- A decision affects cost, licensing, privacy, or security.
- Credentials or paid services are required.
- Cloud resources must be created or changed.
- A destructive migration is required.
- Irreversible data loss is possible.
- A major architecture change is needed.
- Legal or compliance input is required.
- Tests repeatedly fail and the approved design must change.
- Merge approval is required.

Do not stop for routine naming, file structure, tests, styling, validation details, or implementation choices.

## Incremental implementation rules

- Avoid unrelated refactoring.
- Do not introduce deferred features or speculative fields.
- Prefer small coherent changes that can be reviewed independently.
- Preserve existing user changes.
- Do not bypass failed checks or weaken tests to make them pass.
- Do not use destructive Git or database commands without explicit approval.
- Keep generated and local-only files out of Git.
- Record important architecture decisions as they are approved.

## Pull request contract

Every implementation pull request must include:

- Approved scope completed.
- Explicit exclusions and deferred items.
- Files and major components changed.
- Architecture and migration decisions.
- Commands run and their exit results.
- Test and security evidence.
- Known issues and limitations.
- Any follow-up requiring supervisor attention.

The pull request must remain unmerged until the supervisor explicitly approves it.

## Public repository policy

This repository is public. Never commit:

- Customer documents or customer names.
- Private prompts.
- API keys, PATs, passwords, or other credentials.
- Production configuration.
- Proprietary generated applications.
- Internal company data.
- Uploaded files.
- Generated workspaces, previews, exports, or build artifacts.

Use synthetic fixtures in tests and documentation. Treat logs and command output as potentially sensitive before including them in commits or pull requests.
