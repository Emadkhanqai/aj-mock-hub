# AJ Mock Hub

Local-first application for converting written requirements and supporting documents into approved UI specifications and isolated, validated Angular prototype workspaces.

## Prerequisites

- macOS
- Node.js 22 LTS (the repository is pinned by `.nvmrc` and `package.json`)
- npm 10 or newer
- Docker Desktop with Docker Compose
- Git

Node 24 is not supported as the project runtime. With `nvm` installed, run:

```bash
nvm install
nvm use
node --version
```

The Node version must begin with `v22`.

## Install

Run these commands from the repository root:

```bash
cp .env.example .env
npm ci
docker compose up -d
docker compose ps
npm run db:migrate
npm run db:seed
docker build -f docker/angular-builder/Dockerfile -t aj-mock-hub-angular-builder:node22-v1 .
```

The values in `.env.example` are intentionally non-production defaults. Change them in the ignored `.env` file if needed.

Requirements extraction defaults to the deterministic offline provider so local development needs no cloud credentials. To use Azure OpenAI, set `REQUIREMENTS_PROVIDER=azure-openai` and provide the endpoint, key, API version, and deployment name in the ignored `.env` file. Never commit those values.

## Run the applications

Use three terminals:

```bash
npm run start:web
```

```bash
npm run start:api
```

```bash
npm run start:worker
```

The API enqueues trusted orchestration work through Redis and the worker consumes it. Keep both processes running when exercising the pipeline. The worker copies the controlled Angular starter into a version-scoped workspace, then runs lint, test, and build only inside disposable restricted containers. Generated code is never executed on the host.

Local endpoints:

- Web: `http://localhost:4200`
- API health: `http://127.0.0.1:3000/api/health`
- Worker health: `http://127.0.0.1:3001/worker/health`
- MinIO console: `http://127.0.0.1:9001`
- Mailpit: `http://127.0.0.1:8025`

## Verify the workspace

```bash
npm run format:check
npm run lint
npm test
npm run test:integration
CI=1 npm run build
docker compose --env-file .env.example config
```

## Stop local infrastructure

```bash
docker compose down
```

Named volumes preserve local data. Removing volumes is deliberately not part of the normal command because it destroys local data.

## Repository structure

```text
apps/web                 Angular frontend
apps/api                 NestJS API
apps/worker              NestJS worker process
packages/contracts       Shared transport contracts
packages/configuration   Shared configuration utilities
packages/storage         Storage abstractions
packages/generation      Requirement schemas, provider abstraction, and controlled Angular generation
packages/angular-standards Angular generation standards
packages/database        Prisma client, schema, migrations, and seed
packages/job-queue       Shared BullMQ queue names, payloads, and retry policy
packages/build-runner    Allowlisted disposable Docker execution boundary
docs                     Architecture decisions
storage                  Ignored local and generated data
```

Normal development runs the applications directly on macOS for fast feedback. PostgreSQL, Redis, MinIO, and Mailpit run in Docker Compose and bind only to localhost. See [docs/decisions.md](docs/decisions.md) for the rationale and future Azure mapping.

## Project API

The API exposes project creation, listing, and detail plus creation and retrieval of immutable project versions under `/api/projects`. Version numbers are sequential within each project and begin at 1.

For a version, open its requirements workspace in the Angular application. The workflow is:

1. Review the immutable instruction snapshot.
2. Optionally upload TXT, Markdown, PDF, or DOCX documents, up to 10 MB each and 10 per version.
3. Extract an editable framework-independent UI specification.
4. Correct and save the specification.
5. Approve it permanently.
6. Queue staged Angular generation. The worker writes only controlled files and validates them in the isolated builder container.

Uploaded binaries and extracted text are stored in MinIO behind the storage abstraction. PostgreSQL stores metadata and the structured specification, not document bodies.

## Current scope

Milestone 5 includes requirements documents, structured extraction, specification correction and approval, a provider-neutral Azure OpenAI adapter, and controlled staged Angular generation. It does not include preview publishing, targeted revisions, ZIP exports, email sending, authentication, Azure resource deployment, or GitHub integration.
