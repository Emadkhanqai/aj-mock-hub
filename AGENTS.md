# AJ Mock Hub contributor instructions

## Required authoritative context

Before planning, implementing, reviewing, or modifying any task, read these documents in full:

1. `docs/product-brief.md`
2. `docs/roadmap.md`
3. `docs/autonomous-execution.md`
4. `docs/quality-gates.md`
5. Relevant entries in `docs/decisions.md`

These documents define product purpose, architecture, milestone boundaries, execution policy, and completion requirements. Do not proceed from task text alone. If instructions conflict or would require changing an authoritative decision, stop and request clarification.

## Runtime and dependencies

- Use Node.js 22 LTS. Do not change the repository to another Node major without an approved architecture decision.
- Use npm workspaces and commit `package-lock.json`.
- Use repository-local tools through npm scripts or `npx`; never require global Nx, Angular CLI, or Nest CLI installations.
- Keep `nx` and every `@nx/*` dependency on exactly the same version.

## Architecture boundaries

- The frontend is Angular only.
- Keep the API and worker as separate NestJS applications.
- Keep local infrastructure in Docker Compose, while application processes run on macOS during normal development.
- Never mount the Docker socket into an application or generated project.
- Never run generated or untrusted code on the host. A later milestone must build it in a constrained disposable container.
- Treat generated project versions as immutable once versioning is implemented.

## Safety and quality

- Never commit secrets or local `.env` files.
- Do not commit generated workspaces, uploads, exports, build output, coverage, or dependencies.
- Add tests for behavior changes.
- Before marking work complete, run formatting checks, lint, tests, and builds for all affected projects.
- Do not add features deferred beyond the currently approved milestone.
- Resolve local port conflicts autonomously by identifying the owner and moving the AJ Mock Hub localhost binding to a free configurable port. Do not blindly stop or reconfigure unrelated services.

## Autonomous direct-main delivery workflow

Standing user instruction: **"DO NOT MAKE PRS, JUST DIRECT COMMIT ON MAIN BRANCH TO SAVE TIME."**

All implementation work must follow this process:

1. Work directly on `main`; do not create task branches or pull requests unless the user explicitly reverses this standing instruction.
2. Before implementation, synchronize `main`, confirm the working tree is clean, inspect the current architecture, state the task scope, and identify risks and assumptions.
3. During implementation, work incrementally, avoid unrelated refactoring, and do not introduce deferred features.
4. Preserve existing user work and stop if the working tree contains unexplained changes.
5. Before requesting review, run:
   - `npm ci`
   - `npm run format:check`
   - `npm run lint`
   - `npm test`
   - `CI=1 npm run build`
   - Relevant integration and security checks
6. Perform a self-review covering correctness, security, architecture boundaries, test coverage, error handling, migration safety, secrets, and generated-file safety.
7. Commit cohesive verified changes directly on `main` and push `main` without force.
8. Report completed scope, changed files, architecture decisions, commands and exit results, known issues, and deferred items in the task handoff.
9. Address later feedback in a new direct commit; never rewrite or force-push published history.
10. Do not create, approve, or merge pull requests as part of the normal workflow.
11. Automated loops may commit and push verified allowlisted work directly to `main` without waiting for routine approval.
12. Request user input only for business, security, destructive, credential, cost, legal, or major architecture decisions.
