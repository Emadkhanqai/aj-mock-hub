# Known issues

## Dependency audit

As of 2026-07-19, `npm audit` reports 12 findings: one low and eleven moderate, with no high or critical advisories. Five findings are direct root development dependencies (`prisma`, `@nx/angular`, `@nx/web`, `@nx/webpack`, and `webpack-dev-server`); seven are transitive (`@prisma/dev`, `@hono/node-server`, `@nx/module-federation`, `@nx/rspack`, `esbuild`, `sockjs`, and `uuid`).

The production dependency view reports three moderate entries: Prisma plus its transitive `@prisma/dev` and `@hono/node-server` path. npm installs that path as the Prisma Client peer/tooling chain even when development dependencies are omitted. The deployed API does not expose or invoke the affected Hono static-file middleware. npm proposes a major downgrade to Prisma 6, which is incompatible with the reviewed Prisma 7 implementation, so no automated audit fix was applied.

The Nx, webpack-dev-server, SockJS, UUID, and esbuild findings affect local build, test, or development-server paths. The application does not use module federation, does not expose the development server as a production service, and is developed on macOS rather than the Windows-only esbuild advisory path. These advisories remain tracked until compatible upstream releases are available.

The other nine entries are development-only tooling paths. Milestone 5 added OpenAI, Zod, MinIO, Mammoth, and PDF extraction packages without increasing the advisory count or introducing an advisory in those packages.

The controlled Angular 22.0.7 starter has one low transitive esbuild advisory limited to the Windows development server. Builder containers are Linux, run only non-server lint/test/build commands, and have networking disabled. The starter has no high or critical advisories.

## Angular/Nx renderer

Angular builds can stall in an interactive renderer in constrained non-interactive execution environments. `CI=1 npm run build` disables that renderer and is the authoritative production build command used by the quality gates. Normal interactive local builds are not affected.
