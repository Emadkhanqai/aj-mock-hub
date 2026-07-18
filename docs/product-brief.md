# AJ Mock Hub product brief

## Authority

This document is the authoritative product definition for AJ Mock Hub. Every plan, implementation, review, and product decision must remain consistent with it. When a task conflicts with this brief, stop and request clarification before changing product behavior.

## Purpose

AJ Mock Hub converts written requirements and uploaded documents into working Angular UI mockups. It helps product and delivery teams move from requirements to a reviewable frontend prototype and then hand clean source code to developers.

Users will be able to:

- Create projects and enter instructions.
- Upload requirements documents.
- Review AI-extracted pages, workflows, forms, tables, branding, roles, and navigation.
- Correct assumptions before generation.
- Generate a standards-compliant Angular application.
- Preview the result and inspect individual elements.
- Request targeted revisions without regenerating the whole application.
- Preserve accepted revisions as immutable versions.
- Download or share a clean ZIP for developer handoff.

AJ Mock Hub is not:

- A Git platform.
- A backend generator.
- A production deployment platform.
- A full IDE.
- A replacement for developers.

Its responsibility ends at generating high-quality working frontend prototypes and providing a clean, reproducible developer handoff.

## Primary user flow

1. Create a project.
2. Enter instructions.
3. Upload supporting documents.
4. Extract structured requirements.
5. Present the extracted understanding for review.
6. Let the user correct assumptions.
7. Produce a framework-independent UI specification.
8. Convert the approved specification into an Angular plan.
9. Copy a controlled Angular starter template.
10. Generate the application in stages.
11. Build, lint, type-check, test, and repair failures.
12. Publish a preview only after validation succeeds.
13. Let the user revise through prompts or element selection.
14. Save accepted revisions as new immutable versions.
15. Export or email a clean ZIP download link.

## Management experience

Core screens are:

- Project dashboard
- New project
- Requirements review
- Project workspace
- Generation progress and logs
- Preview
- Element inspector
- Revision panel
- Version history
- Version comparison
- Export and sharing
- System health

The preferred workspace layout is:

- Left panel: project navigation, pages, documents, versions, and exports.
- Center: responsive preview.
- Right panel: AI instructions and selected-element properties.
- Top bar: project name, version, build status, preview, sharing, and ZIP download.

Screens and controls must appear only when their supporting product capability is in the approved milestone. Do not add fake generation controls, placeholder uploads, inactive sharing actions, or other speculative UI.

## Approved architecture

- Angular only; there is no framework-selection screen.
- Use the latest approved stable Angular version for new generated projects.
- Pin the Angular version independently for every generated project version.
- Nx monorepo with npm workspaces.
- Node.js 22 LTS.
- Angular management frontend.
- NestJS API and separate NestJS worker.
- PostgreSQL through Prisma.
- Redis through BullMQ.
- MinIO behind a storage abstraction.
- Mailpit for local email testing.
- Docker Compose for local infrastructure.
- Application processes run directly on macOS during development.
- Folder-based generated workspaces.
- Accepted project versions are immutable.
- Static preview builds for the MVP.
- Clean ZIP developer handoff.
- No generated-project GitHub integration in the MVP.
- Microsoft Azure is the future deployment target.

## Generated Angular standards

Generated applications must favor:

- Standalone components.
- Strict TypeScript.
- Angular Router with lazy-loaded feature routes.
- Angular Signals for local UI state.
- Reactive Forms.
- Typed models.
- Reusable shared components.
- Centralized design tokens.
- Accessible semantic HTML.
- Responsive layouts.
- Mock data behind services.
- Minimal third-party dependencies.

Recommended application structure:

```text
src/app/
  core/
  shared/
  features/
  layout/
  app.config.ts
  app.routes.ts
```

Generated applications must avoid business logic in templates, scattered hard-coded colors, unnecessary dependencies, embedded component-level mock data, and full-project regeneration for targeted revisions.

## Staged generation architecture

Generation must be decomposed into controlled stages:

1. Requirements extraction
2. UI specification
3. User review
4. Angular component and route plan
5. Starter-template copy
6. Design tokens
7. Shared components
8. Layout
9. Feature pages
10. Mock services
11. Routing
12. Validation
13. Repair loop
14. Preview publishing

Never ask a model to generate an entire project in one uncontrolled response. Model-driven work must be limited to controlled operations such as `listFiles`, `readFile`, `writeFile`, `applyPatch`, `deleteFile`, `runApprovedCommand`, and `readBuildOutput`.

## Revision and version model

- Draft revisions are temporary.
- Accepted revisions become immutable project versions.
- Existing accepted versions are never overwritten.
- A new accepted revision creates a new version.
- Prefer targeted file patches over broad regeneration.
- Every revision must pass validation before acceptance.
- Element selection must identify the component, file, element ID, and element type.

## Storage model

Product source code is separate from generated customer applications. The conceptual generated-workspace layout is:

```text
storage/workspaces/<project-id>/
  versions/001/
  versions/002/
  current/
  uploads/
  previews/
  exports/
```

Metadata belongs in PostgreSQL. Documents, generated source, previews, ZIPs, and artifacts must be accessed through the storage abstraction.

## ZIP handoff contract

Exports must include source code, `package.json`, `package-lock.json`, Angular and TypeScript configuration, a README, `.env.example`, the UI specification, and design-system documentation.

Exports must exclude `node_modules`, `dist`, `.angular`, coverage, `.env`, secrets, caches, uploaded source documents, internal prompts, generation logs, and temporary preview files. Every export must contain exact setup and run commands.

## Security boundary

Generated code is untrusted. Never run it on the host, mount the Docker socket, expose host credentials, mount a user home directory, expose SSH keys, use privileged containers, or commit customer content or generated applications to this public repository.

Future builder containers must be disposable and enforce CPU, memory, process, and time limits; restricted networking; captured output; and cleanup after execution.

## Local-to-Azure direction

| Local service      | Future Azure direction                                  |
| ------------------ | ------------------------------------------------------- |
| PostgreSQL         | Azure Database for PostgreSQL                           |
| Redis              | Azure Managed Redis                                     |
| MinIO              | Azure Blob Storage                                      |
| NestJS API         | Azure Container Apps or App Service                     |
| NestJS worker      | Azure Container Apps or Jobs                            |
| Builder containers | Azure Container Apps Jobs or Azure Container Instances  |
| Secrets            | Azure Key Vault                                         |
| Logs               | Application Insights                                    |
| Mailpit            | Approved email provider or Azure Communication Services |

Infrastructure-specific behavior must remain behind interfaces so local services can be replaced without changing core product logic.
