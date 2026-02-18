# TaskOS Security Overview

This document describes the security architecture of TaskOS for enterprise evaluation.

## Authentication

### Session Strategy
- **JWT-based sessions** via NextAuth.js v5.
- Tokens expire after **24 hours** (`maxAge`) and refresh silently every **1 hour** (`updateAge`).
- Session cookies are `httpOnly`, `SameSite=Lax`, and `Secure` in production.
- No cookie name override -- NextAuth internal defaults are preserved to avoid conflicts with its CSRF and callback cookies.

### OAuth
- Google OAuth 2.0 provider with PKCE.
- Account linking is handled server-side with explicit checks (no `allowDangerousEmailAccountLinking`).

### Credential Auth
- Passwords are hashed with **bcrypt** (cost factor 10).
- Failed login attempts are rate-limited per **IP + identifier** to prevent brute-force without locking out shared-IP users.

## API Keys

- Prefixed with `taskos_` for easy identification; stored as **SHA-256 hashes** -- the plain key is shown only once at creation.
- **Scopes**: default is `["read:tasks"]`. `write:tasks` and `manage:workspace` must be explicitly requested.
- **Workspace binding**: keys can be optionally bound to a single workspace; cross-workspace access is rejected.
- **Expiration**: optional `expiresAt` timestamp.
- **Revocation**: soft-revoke via `revokedAt` timestamp; revoked keys are immediately rejected.

## Authorization (RBAC)

Four workspace roles with a strict permission matrix:

| Action | Viewer | Member | Admin | Owner |
|--------|--------|--------|-------|-------|
| Read tasks / activity | Yes | Yes | Yes | Yes |
| Comment on tasks | - | Yes | Yes | Yes |
| Create tasks | - | Yes | Yes | Yes |
| Update tasks | - | Yes | Yes | Yes |
| Delete tasks | - | - | Yes | Yes |
| Manage workspace / members | - | - | Yes | Yes |
| Transfer ownership / promote admins | - | - | - | Yes |

### Anti-Escalation
- Admins **cannot** promote users to admin or owner.
- Only the owner can assign the admin role.
- The `canAssignRole()` function enforces this at every role-change call site.

## CSRF Protection

- **Session-based routes** (`/api/*` excluding `/api/v1/*`): Origin / Referer header validation for all state-changing methods (POST, PUT, PATCH, DELETE). Requests without a valid same-origin header are rejected with 403.
- **Public API** (`/api/v1/*`): Bearer-token-only authentication -- inherently CSRF-immune because browsers do not auto-attach Authorization headers.

## Encryption

- **AES-256-GCM** with a 32-byte key derived from `ENCRYPTION_KEY` via SHA-256.
- Versioned ciphertext format: `enc_v1:<iv>:<tag>:<ciphertext>` using **base64url** encoding.
- Legacy hex format is supported for decryption only (backward compatibility).
- **Fail-closed**: if `ENCRYPTION_KEY` is missing, the application throws at startup -- no plaintext fallback.
- Key length is validated at startup; must derive exactly 32 bytes.

## Multi-Tenant Isolation

- All data access is scoped to workspace membership. Every query includes a `workspaceId` filter and verifies the calling user is a workspace member.
- API keys can be bound to a specific workspace, preventing cross-workspace data leakage even with a compromised key.
- Workspace membership is checked at the permission layer before any data access.

## Audit Logging

- Security-critical actions are logged to the `audit_logs` table with: user, workspace, action, entity, metadata, and IP address.
- `logAudit()` is **awaited** to ensure persistence in serverless, but wrapped in an internal try/catch so it **never throws** -- audit failure does not break the calling request.
- Logged events include: API key creation/revocation, role changes, authentication events, and data exports.

## Rate Limiting

- **API requests**: per-minute, per-hour, and per-day limits based on plan tier (Pro / Enterprise).
- **Failed authentication**: rate-limited by **IP + identifier** compound key to prevent brute-force without locking out all users behind a shared NAT.
- Rate limit hits are logged to server console with identifiers.
- Standard `X-RateLimit-*` and `Retry-After` headers are returned on 429 responses.

## Security Headers

All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (production only)

## Error Handling

- API errors return structured JSON with `error` and `code` fields.
- Stack traces and internal details are **never** exposed to clients in production.
- The `ApiError` class and `errorResponse()` helper enforce consistent error formatting.

## Dependencies

- **Dependabot** is configured for weekly security updates on both the main app and VS Code extension.
- **CI workflow** runs `npm audit` on every push/PR to main and on a weekly schedule.
- Production dependencies are audited at `high` severity level; all dependencies at `critical` level.

## Encryption Key Management

- `ENCRYPTION_KEY` must be set as an environment variable in all environments.
- Generate with: `openssl rand -base64 32`
- Key rotation requires re-encrypting existing data (the versioned format enables future automated rotation).

## Responsible Disclosure

If you discover a security vulnerability, please report it to **security@taskos.app**. We aim to acknowledge reports within 48 hours and provide a fix timeline within 5 business days.
