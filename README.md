# AJ Mock Hub

Local-first foundation for creating, validating, versioning, and handing off Angular interface prototypes. Milestone 1 establishes the monorepo, application shells, shared packages, and local infrastructure only.

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
npm run build
docker compose config
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
docs                     Architecture decisions
storage                  Ignored local and generated data
```

Normal development runs the applications directly on macOS for fast feedback. PostgreSQL, Redis, MinIO, and Mailpit run in Docker Compose and bind only to localhost. See [docs/decisions.md](docs/decisions.md) for the rationale and future Azure mapping.

## Current scope

Milestone 1 does not include Prisma, BullMQ queues, AI integration, generated templates, isolated builder containers, ZIP exports, email sending, authentication, preview hosting, or Azure integrations.
