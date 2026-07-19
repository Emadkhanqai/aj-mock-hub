# Milestone 8 security review

Reviewed boundaries: uploads, requirement extraction, model provider inputs, controlled generation, disposable builds, static previews, cross-window selection, draft acceptance, version copying, ZIP packaging, signed downloads, SMTP sharing, PostgreSQL constraints, Redis jobs, and object storage.

Controls verified:

- Generated code is never executed on the host and receives no network, Docker socket, home directory, SSH keys, or host credentials.
- Accepted versions, approved specifications, preview metadata, and export metadata have database immutability enforcement.
- Preview iframes use an opaque sandbox and restrictive CSP; message payloads and sources are validated.
- Upload, preview, and export paths reject traversal and symlinks and enforce file/byte bounds.
- ZIPs exclude local environments, secrets, keys, dependencies, caches, logs, uploads, previews, and build output.
- Download signatures are time-bound and compared in constant time; storage keys and credentials are not exposed.
- API validation and the global error filter prevent raw internal errors from reaching clients.
- Repository scans find no tokens, private keys, customer documents, generated workspaces, exports, dependencies, or build output.

Known residual risks for post-MVP work: there is no authentication or tenant authorization; a bearer download link is usable by anyone who possesses it until expiry; local development credentials are intentionally non-production defaults; retention automation for accepted customer data awaits legal policy; dependency audit advisories in the Nx/Prisma development toolchain remain without high or critical findings.
