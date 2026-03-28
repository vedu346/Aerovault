# Aerovault Monorepo

This repository is now organized as a clean monorepo with clear frontend/backend separation.

## Project structure

```text
project-root/
├── frontend/            # Next.js app (UI + app route handlers)
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── styles/
│   │   ├── assets/
│   │   ├── utils/
│   │   └── lib/
│   └── package.json
├── backend/             # Backend scripts/services and future API layering
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── config/
│   └── package.json
├── database/
│   ├── migrations/
│   └── schema/
├── docs/
├── .env / .env.local
└── README.md
```

## Why this layout

- **Frontend** keeps all Next.js runtime code and static assets in one workspace.
- **Backend** isolates operational scripts and provides expansion points for dedicated services.
- **Database** separates migration/schema assets from application code.
- **Docs** stores architecture and maintenance notes.

See `docs/reorganization-notes.md` for move-by-move details.

## Getting started

Install dependencies from the repo root:

```bash
npm install
```

Run frontend dev server:

```bash
npm run dev
```

Build frontend:

```bash
npm run build
```

Run backend bootstrap scripts:

```bash
npm run backend:setup-accounts
npm run backend:seed-roles
```
