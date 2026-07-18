# Known issues

## Dependency audit

As of 2026-07-18, `npm audit` reports 12 toolchain findings: one low and eleven moderate, with no high or critical advisories. The direct packages listed are Prisma, Nx Angular/Web/Webpack, and webpack-dev-server; the remaining findings are transitive dependencies of those development and generation tools.

The production-only audit view reports Prisma plus its transitive `@prisma/dev` and `@hono/node-server` path. Prisma is used at development time for client generation and migrations; the deployed API uses `@prisma/client` and does not expose the affected Hono static-file middleware. npm proposes a major downgrade to Prisma 6, which is incompatible with the reviewed Prisma 7 implementation, so no automated audit fix was applied.

The Nx, webpack-dev-server, SockJS, UUID, and esbuild findings affect local build, test, or development-server paths. The application does not use module federation, does not expose the development server as a production service, and is developed on macOS rather than the Windows-only esbuild advisory path. These advisories remain tracked until compatible upstream releases are available.

## Angular/Nx renderer

Angular builds can stall in an interactive renderer in constrained non-interactive execution environments. `CI=1 npm run build` disables that renderer and is the authoritative production build command used by the quality gates. Normal interactive local builds are not affected.
