# Azure migration target

AJ Mock Hub remains local-first. This runbook defines the future mapping without creating cloud resources.

| Local capability   | Azure target                                           | Migration boundary                                                                          |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| PostgreSQL         | Azure Database for PostgreSQL Flexible Server          | unchanged Prisma schema; managed identity/Key Vault connection secret                       |
| Redis/BullMQ       | Azure Managed Redis                                    | unchanged queue contracts; TLS endpoint from Key Vault                                      |
| MinIO              | Azure Blob Storage                                     | replace `ObjectStorage` adapter; preserve private containers and prefixes                   |
| API/web            | Azure Container Apps or App Service                    | health probes use `/api/health`; Angular served same-origin                                 |
| Worker             | Azure Container Apps                                   | independent scaling from BullMQ depth                                                       |
| Disposable builder | Container Apps Jobs or Azure Container Instances       | no network by default, non-root, resource/time limits, ephemeral volumes                    |
| Mailpit            | Azure Communication Services or approved SMTP provider | keep SMTP/delivery interface; domain and compliance approval required                       |
| Logs/metrics       | Application Insights                                   | structured job IDs, project/version IDs, safe error codes; never prompts or document bodies |
| Secrets            | Azure Key Vault                                        | managed identity; no secrets in images or environment files                                 |

Migration order: provision private networking and identities; restore a sanitized PostgreSQL backup; introduce Blob and Redis adapters behind existing interfaces; deploy API and worker; validate health and a synthetic end-to-end flow; migrate objects with hash verification; switch traffic; retain rollback snapshots. Production deployment requires explicit cost, region, data residency, backup, identity, email-domain, and security approval.
