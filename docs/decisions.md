# Architecture decisions

## Approved foundation

AJ Mock Hub is an Angular-only, local-first application. The repository is an integrated Nx monorepo containing an Angular frontend, a NestJS API, a separate NestJS worker, and shared packages. npm workspaces provide package management.

## Node.js 22 LTS

The repository pins Node.js 22 because it is an active long-term-support line with a more conservative compatibility surface than the locally installed Node 24 release. `.nvmrc`, `package.json` engines, future Dockerfiles, and project documentation must remain on the same Node 22 major version. Developers may keep other system Node versions installed.

## Local applications outside Docker

During normal development, the Angular frontend and NestJS processes run directly on macOS. This keeps file watching, debugging, dependency installation, and editor integration fast and transparent. Docker Compose is limited to PostgreSQL, Redis, MinIO, and Mailpit, which gives the team reproducible stateful dependencies without containerizing the inner development loop.

## Future isolated builds

Generated projects are untrusted inputs. A later milestone will build each generated Angular application in a disposable, constrained container with controlled resources, time limits, restricted networking, and no host Docker socket mounted inside it. Milestone 1 neither builds nor executes generated code.

## Local-to-Azure mapping

| Local component            | Intended Azure direction                                  |
| -------------------------- | --------------------------------------------------------- |
| PostgreSQL                 | Azure Database for PostgreSQL Flexible Server             |
| Redis                      | Azure Managed Redis                                       |
| MinIO object storage       | Azure Blob Storage                                        |
| Mailpit                    | Azure Communication Services or an approved mail provider |
| NestJS API                 | Azure Container Apps or App Service                       |
| NestJS worker              | Azure Container Apps Jobs or a worker Container App       |
| Disposable build container | Azure Container Apps Jobs or Azure Container Instances    |

The application will depend on abstractions and environment configuration rather than local service-specific assumptions where practical. No Azure integration is implemented in Milestone 1.

## Deferred decisions

Later milestones will decide and implement:

- Prisma schema, migrations, and project domain entities
- BullMQ queue topology, retry policy, and job observability
- AI model providers, prompt contracts, and safety policy
- Generated Angular templates and validation standards
- Disposable builder image and container orchestration
- Immutable version storage and ZIP handoff format
- Email delivery, authentication, and authorization
- Preview hosting and retention
- Detailed Azure service selection, networking, identity, and deployment automation
- GitHub integration, which is explicitly outside the MVP
