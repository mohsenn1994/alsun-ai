# alsun — Dynamic Form Builder

Build forms with text, multiple-choice, and file-upload questions; publish them to a
shareable public link; collect responses (including file uploads) from anonymous
respondents; and review submissions with downloadable files — all in a typed
TypeScript monorepo.

**Live demo** _(fill in once deployed — see [CI/CD](#cicd) and [`DEPLOY.md`](./DEPLOY.md))_

- Web: `https://<your-app>.vercel.app`
- API: `https://<your-api>.up.railway.app`

## Screenshots

| Login | Forms dashboard |
|---|---|
| ![Login](docs/screenshots/login.png) | ![Forms](docs/screenshots/forms.png) |

| Form editor | Public form |
|---|---|
| ![Editor](docs/screenshots/editor.png) | ![Public form](docs/screenshots/public-form.png) |

| Responses list | Submission detail |
|---|---|
| ![Responses](docs/screenshots/responses.png) | ![Submission](docs/screenshots/submission.png) |

## Stack

- **Backend** — Fastify 5 + TypeScript, Sequelize (PostgreSQL), `@fastify/multipart` for uploads
- **Frontend** — React 18 + Vite, Tailwind CSS v4, TanStack Query v5, dnd-kit (drag reorder)
- **Shared** — a `@alsun/schemas` package of Zod schemas + types, imported by both apps
- **Tooling** — npm workspaces, Jest (ts-jest), GitHub Actions

## Monorepo layout

```
backend          Fastify + TypeScript API
frontend         React + Vite + Tailwind SPA
shared/schemas   Zod schemas + types — imported by BOTH apps
```

### The shared-schemas spine

`@alsun/schemas` is the heart of the design: each form/question/answer shape, and the
per-answer validator `validateAnswerValue`, is defined **once** and reused on the API and
in the browser. The server treats the client as untrusted and re-validates every
submission with the same code the client uses for instant feedback — no drift between the
two, no duplicated rules.

## Features

- **Form management** — create, rename, delete forms; draft/published status.
- **Questions** — add/edit/delete Text, Multiple Choice (configurable options, single or
  multi-select), and File Upload questions; each can be required. Type is fixed once
  created. Drag-to-reorder (keyboard-accessible) with a full-position rewrite on the server.
- **Publishing** — publish mints a random, URL-safe public token; the form becomes
  reachable at `/f/:token`. Unpublishing hides it again (the token is kept, so re-publishing
  reuses the link). Drafts and unknown tokens are indistinguishable from the outside (404).
- **Public submission** — an unauthenticated page renders the form by type and submits
  answers. Required fields and per-type validity are enforced **server-side**; errors come
  back keyed by question so the UI can highlight the offending field.
- **File uploads** — a two-step flow: the file is streamed to a persistent volume and
  returns a `fileId`; the submission references that id. Size-capped (10 MB) and verified
  to exist (and be unused) at submit time.
- **Responses dashboard** — list submissions per form and a detail view showing each
  question with its answer, with authenticated download links for uploaded files.

## Prerequisites

- Node 20+
- PostgreSQL (local, or Neon/Railway in the cloud)

## Setup

```bash
npm install

cp backend/.env.example backend/.env       # set DATABASE_URL, AUTH_*, COOKIE_SECRET
cp frontend/.env.example frontend/.env      # leave VITE_API_URL empty for local dev
```

### Environment variables

**Backend** (`backend/.env`):

| Variable        | Purpose                                                         |
|-----------------|-----------------------------------------------------------------|
| `DATABASE_URL`  | PostgreSQL connection string                                    |
| `AUTH_USERNAME` | Single creator's username                                       |
| `AUTH_PASSWORD` | Single creator's password                                       |
| `COOKIE_SECRET` | Long random string used to sign the session cookie              |
| `WEB_ORIGIN`    | Allowed CORS origin (the web app's URL)                         |
| `UPLOAD_DIR`    | Where uploads are written (`./uploads` locally, `/uploads` prod)|
| `PORT` / `HOST` | Bind address (Railway sets `PORT` automatically)                |

**Frontend** (`frontend/.env`): `VITE_API_URL` — empty in dev (uses the Vite proxy), set
to the API origin in production.

### Database

`DATABASE_URL` in `backend/.env.example` points at `postgres://app:app@localhost:5432/alsun`.
Railway/Neon provision this automatically in production, but locally you need a Postgres
server running with that role and database created once:

```bash
createuser app --login --pwprompt    # set the password to "app" (or update DATABASE_URL to match)
createdb alsun --owner=app
```

Then apply the schema:

```bash
npm run db:migrate    # syncs Sequelize models to the database (creates tables)
```

## Run (dev)

```bash
npm run dev          # API on :3000 and web on :5173 together
# or: npm run dev:backend / npm run dev:frontend
```

Open http://localhost:5173 and sign in with your `AUTH_USERNAME` / `AUTH_PASSWORD`.

## Testing

```bash
npm test             # runs all package test suites
```

Unit tests live in `@alsun/schemas` (Jest + ts-jest) and cover `validateAnswerValue`
across all three question types and their edge cases — the validation logic that both the
API and the browser depend on.

## API reference

Auth (single creator):

- `POST /api/auth/login` — `{ username, password }` → signed session cookie
- `POST /api/auth/logout` — clears the session
- `GET /api/auth/me` — `{ authenticated, username? }`

Forms & questions (require auth):

- `POST /api/forms` · `GET /api/forms` · `GET /api/forms/:id` · `PATCH /api/forms/:id` · `DELETE /api/forms/:id`
- `POST /api/forms/:id/publish` — `{ published }` (mints the public token on first publish)
- `POST /api/forms/:id/questions` · `POST /api/forms/:id/questions/reorder` (`{ orderedIds }`)
- `PATCH /api/questions/:id` · `DELETE /api/questions/:id`
- `GET /api/forms/:id/submissions` — list responses (with answer counts)
- `GET /api/submissions/:id` — submission detail (answers resolved against questions)
- `GET /api/files/:id` — download an uploaded file

Public (no auth):

- `GET /api/public/forms/:token` — fetch a published form
- `POST /api/public/uploads` — multipart upload → `{ fileId }`
- `POST /api/public/forms/:token/submissions` — `{ answers: [{ questionId, value }] }`

Invalid input returns `400` with field-level `details`; missing/unknown resources return `404`.

### Health endpoints

- `GET /health` — liveness (point the platform's health check here)
- `GET /health/ready` — readiness; verifies the DB is reachable (503 if down)
- `GET /health/storage` — confirms the upload volume is writable

## CI/CD

GitHub Actions in [`.github/workflows`](./.github/workflows):

- **`ci.yml`** — on pull requests and branch pushes: `npm ci`, `typecheck`, `test`, `build`.
- **`deploy.yml`** — on push to `main`: re-runs the checks, then deploys the API to Railway
  and the web app to Vercel.

Configure these repository **secrets** for `deploy.yml`:

| Secret              | Used for                                  |
|---------------------|-------------------------------------------|
| `RAILWAY_TOKEN`     | Railway project token (backend deploy)    |
| `VERCEL_TOKEN`      | Vercel token (frontend deploy)            |
| `VERCEL_ORG_ID`     | Vercel organization id                    |
| `VERCEL_PROJECT_ID` | Vercel project id (root dir = `frontend`) |

And a repository **variable** `RAILWAY_SERVICE` set to the backend service's name.

> Railway and Vercel also offer native "deploy on push" GitHub integrations; the workflows
> here do the equivalent via each platform's CLI so the pipeline is explicit and reviewable.

## Deployment

- **API** → Railway (Dockerfile build; persistent volume mounted at `/uploads`)
- **Web** → Vercel (root directory `frontend`; set `VITE_API_URL` to the API origin)
- **DB** → Railway Postgres or Neon

See [`DEPLOY.md`](./DEPLOY.md) for the step-by-step runbook (variables, volume setup, and the
volume-persistence verification).

## Scope, assumptions & future work

Deliberate simplifications for this exercise:

- **Single creator** — credentials from env; no multi-user accounts or organizations.
- **No published-form versioning** — edits to a published form take effect immediately for
  new visitors.
- **Anonymous, one-shot submissions** — no save-draft, no editing after submit, no rate
  limiting beyond the upload size cap.
- **Volume storage** over object storage (S3/R2) — keeps the project self-contained and
  runnable with no external accounts. `GET /api/files/:id` streams from the volume.
- **`sequelize.sync()`** for schema setup — a real deployment would use versioned migrations
  (sequelize-cli / Umzug).

**Bonus — conditional visibility (not yet implemented):** the schema reserves a
`visibilityRule` field per question (a placeholder today). The intended design is a
recursive boolean rule tree (AND/OR/NOT with type-specific operators) plus a pure
`evaluate()` in `@alsun/schemas`, re-checked server-side at submit time so hidden questions
aren't required. See [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## More

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — full plan, data model, API surface, task breakdown
- [`DEPLOY.md`](./DEPLOY.md) — deployment runbook
