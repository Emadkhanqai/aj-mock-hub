# AJ Mock Hub contributor instructions

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
- Do not add deferred Milestone 1 features without explicit approval.
