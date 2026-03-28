# Reorganization Notes

This document records what was moved during the frontend/backend separation and why.

## Frontend moves

- Moved `app/` to `frontend/src/app/` to keep all Next.js UI and API route handlers inside the frontend workspace.
- Moved `components/` to `frontend/src/components/` so reusable UI modules stay close to frontend pages.
- Moved `lib/` to `frontend/src/lib/` and `utils/` to `frontend/src/utils/` to keep shared frontend runtime helpers in one place.
- Moved `public/` to `frontend/public/` because Next.js serves static assets from this folder within the app package.
- Moved Next.js config files (`next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json`, `.npmrc`, `proxy.ts`) into `frontend/` so they only apply to the frontend app.

## Backend moves

- Moved account/bootstrap scripts (`create-demo-user.js`, `verify-login.js`, `scripts/seed-roles.js`, `scripts/setup-accounts.js`) to `backend/src/services/account-bootstrap/` because they are operational backend scripts.
- Moved `result.txt` into `backend/src/services/logs/registration-result.txt` to keep generated service logs with related backend scripts.

## Structural additions

- Added root `package.json` with npm workspaces for `frontend` and `backend`.
- Added `backend/package.json` to define backend-only script entry points.
- Added `database/migrations/` and `database/schema/` directories to isolate DB artifacts.
