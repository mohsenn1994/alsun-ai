# Architecture

---

## 1. Design Decisions

| Area | Decision | Rationale |
|---|---|---|
| Repo | npm-workspaces monorepo, 3 packages | Backend and frontend share types and validation logic through a single `@alsun/schemas` package |
| Backend | Fastify + TypeScript | Required by spec; Fastify's plugin model and typed request/reply keep things structured without boilerplate |
| Frontend | React + TypeScript + Vite | Required by spec; Vite for fast builds and a clean dev proxy setup |
| Validation/types | Shared `@alsun/schemas` package (Zod) | Required-field and per-type validation written once, run on both client and server — no drift |
| DB | PostgreSQL + Sequelize ORM | Mature, well-documented; class-based models with typed attributes |
| Flexible question data | Single `questions` table + JSONB `config` | Avoids a table-per-type schema; the `config` column is validated by a per-type Zod schema at runtime |
| File storage | Railway persistent volume (local disk) | Simplest option that survives redeploys. Object storage (R2/Supabase) is the production-correct alternative and a natural next step |
| Auth | Single creator credential from env → signed cookie | Establishes the creator/public boundary cleanly; public routes remain fully open |
| Reordering | Integer `position`, full rewrite in a transaction | Simple and correct at the scale of questions per form; no fractional indexing needed |

**Scope decisions:**
- Single creator account — credentials are environment variables; no multi-user or org model.
- No edit-after-publish versioning — edits to a published form apply to new submissions immediately.
- No real-time collaboration.

---

## 2. System Architecture

```
┌─────────────────────┐         ┌──────────────────────────┐
│  React + Vite (SPA) │  HTTPS  │  Fastify API (TypeScript) │
│  - Builder (auth)   │ ──────► │  - /api/...    (creator)  │
│  - Dashboard (auth) │         │  - /api/public (open)     │
│  - Public form page │         │  - /api/files  (download) │
│    (Vercel)         │         │      (Railway + volume)   │
└─────────────────────┘         └────────────┬─────────────┘
                                              │
                            ┌─────────────────┴───────────────┐
                            │  PostgreSQL  │  Volume (/uploads) │
                            └──────────────────────────────────┘

         Shared package: @alsun/schemas  (Zod types + validation)
         imported by BOTH frontend and backend
```

The shared `@alsun/schemas` package is the spine of the design. It exports entity types and request/response Zod schemas used by both apps. Both apps depend on it, so validation logic can never drift between client and server.

---

## 3. Data Model (PostgreSQL)

```
forms
  id            uuid pk
  title         text not null
  status        text not null default 'draft'   -- 'draft' | 'published'
  public_token  text unique                     -- null until first publish
  created_at    timestamptz
  updated_at    timestamptz

questions
  id              uuid pk
  form_id         uuid fk -> forms (cascade delete)
  type            text not null                 -- 'text' | 'multiple_choice' | 'file'
  label           text not null
  required        boolean not null default false
  position        int not null                  -- 0-based order within form
  config          jsonb not null default '{}'   -- e.g. { options: ["A","B"] } for MCQ

submissions
  id          uuid pk
  form_id     uuid fk -> forms
  created_at  timestamptz

answers
  id             uuid pk
  submission_id  uuid fk -> submissions (cascade delete)
  question_id    uuid fk -> questions
  value          jsonb not null                -- string | string[] | { fileId } etc.

files
  id          uuid pk
  answer_id   uuid fk -> answers (nullable until linked)
  storage_key text not null                     -- path on volume
  filename    text not null
  mime_type   text not null
  size        int not null
  created_at  timestamptz
```

**Notes:**
- `config` JSONB keeps the schema stable as question types grow. Each type has a corresponding Zod schema so the column is validated, not free-form.
- `answers.value` shape depends on question type and is validated against the question's type at submit time.
- Normalised `answers` make the dashboard a clean join.

---

## 4. API Design

**Creator (authenticated):**
```
POST   /api/auth/login                      -> sets signed session cookie
POST   /api/auth/logout                     -> clears session cookie
GET    /api/auth/me                         -> { authenticated, username? }
POST   /api/forms                           create
GET    /api/forms                           list
GET    /api/forms/:id                       get form + ordered questions
PATCH  /api/forms/:id                       rename / update
DELETE /api/forms/:id
POST   /api/forms/:id/questions             add question
PATCH  /api/questions/:id                   edit (label, required, config)
DELETE /api/questions/:id
POST   /api/forms/:id/questions/reorder     body: { orderedIds: string[] }
POST   /api/forms/:id/publish               toggle status; mint public_token on first publish
GET    /api/forms/:id/submissions           summary list
GET    /api/submissions/:id                 full detail + file links
```

**Public (unauthenticated):**
```
GET    /api/public/forms/:token             published form for rendering
POST   /api/public/uploads                  multipart; returns { fileId }
POST   /api/public/forms/:token/submissions JSON body referencing fileIds
```

**Files:**
```
GET    /api/files/:id                       download (creator auth required)
```

**File upload pattern — two-step:** the client uploads each file to `/api/public/uploads` first (returns a `fileId`), then submits a JSON body where file answers reference `{ fileId }`. This avoids parsing mixed multipart bodies at submission time and keeps submission validation pure JSON.

---

## 5. Testing

Tests focus on the load-bearing pure logic rather than broad coverage:

- **`validateAnswerValue`** — unit-tested across all three question types and edge cases in `shared/schemas/tests/`. This is the validation function both the API and the browser depend on.
- **API integration** — a thin smoke-test suite covering the create → publish → submit → read flow.

---

## 6. Deployment

| Component | Platform | Notes |
|---|---|---|
| Frontend (SPA) | Vercel | Static build; `VITE_API_URL` points to the API |
| Backend (Fastify) | Railway | Long-running; handles multipart cleanly |
| Database | Railway Postgres (or Neon) | |
| File storage | Railway volume at `/uploads` | |

CORS is locked to the Vercel origin in production. The session cookie is set with `SameSite=None; Secure` for cross-origin credentialed requests, and `clearCookie` uses matching attributes so the browser correctly removes it on sign-out.

The production-correct alternative to a volume is object storage (Cloudflare R2 / Supabase Storage), which decouples files from the compute host. The volume approach is a deliberate simplification for this project.
