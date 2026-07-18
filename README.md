# AJ Mock Hub

Local-first application for creating, preserving, and reviewing versioned Angular interface briefs. Milestone 2 adds the first real domain: projects and immutable project versions.

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
```

The values in `.env.example` are intentionally non-production defaults. Change them in the ignored `.env` file if needed.

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

The API enqueues trusted orchestration work through Redis and the worker consumes it. Keep both processes running when exercising the Milestone 3 pipeline. The worker prepares empty, version-scoped directories only; it does not execute generated code.

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
packages/angular-standards Angular generation standards
packages/database        Prisma client, schema, migrations, and seed
packages/job-queue       Shared BullMQ queue names, payloads, and retry policy
docs                     Architecture decisions
storage                  Ignored local and generated data
```

Normal development runs the applications directly on macOS for fast feedback. PostgreSQL, Redis, MinIO, and Mailpit run in Docker Compose and bind only to localhost. See [docs/decisions.md](docs/decisions.md) for the rationale and future Azure mapping.

## Project API

The API exposes project creation, listing, and detail plus creation and retrieval of immutable project versions under `/api/projects`. Version numbers are sequential within each project and begin at 1. Version-scoped job endpoints enqueue workspace preparation, list jobs, return bounded lifecycle logs, and request cancellation.

## Current scope

Milestone 3 does not include AI integration, uploads, MinIO application flows, generated templates, isolated builder containers, arbitrary command execution, ZIP exports, email sending, authentication, preview hosting, Azure implementation, or GitHub integration.
