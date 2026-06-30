# Dynamic Form Builder — Architecture & Implementation Plan

> Take-home interview project. Guiding principle: **a complete, plain, end-to-end app beats a beautiful half.** Every decision below optimizes for senior signal at minimum complexity.

---

## 1. Scope & Guiding Decisions

| Area | Decision | Why |
|---|---|---|
| Repo | npm-workspaces monorepo, 3 packages | Lets backend + frontend share types & validation (the key senior signal) |
| Backend | Fastify + TypeScript | Required by spec |
| Frontend | React + TypeScript + Vite | Required by spec; Vite for fast, simple builds |
| Validation/types | Shared `@alsun/schemas` package (Zod) | Required-field + conditional logic written **once**, run on both sides |
| DB | PostgreSQL + Sequelize ORM | Mature, well-documented; class-based models with typed attributes. Validation stays in the Zod schema package |
| Flexible question data | Single `questions` table + JSONB `config` | Avoids table-per-type; pragmatic and defensible |
| File storage | Railway persistent volume (local disk on a non-ephemeral host) | Simplest thing that survives deploy. Object storage (R2/Supabase) is the production-correct alt — note this in README |
| Auth | Single creator, one env credential → signed cookie/JWT | Establishes the creator/public boundary with ~30 min of work. Public routes stay open |
| Reordering | Integer `position`, rewritten in a transaction on reorder | N is small (questions per form). Simpler than fractional indexing for this scale |

**Explicit scope cuts (state these in the README):**
- No multi-user / org model. One creator account.
- No edit-after-publish versioning. Editing a published form affects new submissions only.
- No real-time collaboration.
- Conditional rules may only reference **earlier** questions (by position) — sidesteps cycle detection entirely.

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

         Shared package: @alsun/schemas  (Zod types + evaluate())
         imported by BOTH frontend and backend
```

The shared `@alsun/schemas` package is the spine. It exports: entity types, request/response Zod schemas, the `Condition` type, and the pure `evaluate()` and `requiredVisibleQuestions()` functions. Both apps depend on it.

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
  visibility_rule jsonb                          -- null = always visible (the bonus)

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

**Notes**
- `config` JSONB keeps the schema stable as question types grow. Define a Zod schema per type so it's validated, not free-form.
- `answers.value` shape depends on question type — validate it against the question's type at submit time.
- Normalized `answers` make the dashboard a clean join, no JSON digging.

---

## 4. API Design

**Creator (authenticated):**
```
POST   /api/auth/login                      -> sets cookie
POST   /api/forms                           create
GET    /api/forms                           list
GET    /api/forms/:id                        get form + ordered questions
PATCH  /api/forms/:id                        rename / update
DELETE /api/forms/:id
POST   /api/forms/:id/questions              add question
PATCH  /api/questions/:id                    edit (label, required, config, visibility_rule)
DELETE /api/questions/:id
POST   /api/forms/:id/questions/reorder      body: { orderedIds: string[] }
POST   /api/forms/:id/publish                toggle status; mint public_token on first publish
GET    /api/forms/:id/submissions            summary list
GET    /api/submissions/:id                  full detail + file links
```

**Public (unauthenticated):**
```
GET    /api/public/forms/:token              published form for rendering (no answers)
POST   /api/public/uploads                   multipart; returns { fileId }  (two-step upload)
POST   /api/public/forms/:token/submissions  JSON body referencing fileIds
```

**Files:**
```
GET    /api/files/:id                        download (creator-auth for dashboard view)
```

**File upload pattern (chosen for simplicity):** two-step. The public client uploads each file to `/api/public/uploads` first (returns a `fileId`), then submits a JSON body where file answers reference `{ fileId }`. This avoids parsing mixed multipart bodies and keeps submission validation pure JSON.

---

## 5. The Bonus — Conditional Logic

This is where the interview is won. Treat it as a separable module.

**The rule tree (in `@alsun/schemas`):**
```ts
type Operator =
  // text
  | 'equals' | 'contains' | 'isEmpty' | 'isNotEmpty'
  // multiple_choice
  | 'includes' | 'equalsSet' | 'isAnswered'
  // file
  | 'isUploaded' | 'isNotUploaded';

type Condition =
  | { kind: 'leaf'; questionId: string; operator: Operator; value?: unknown }
  | { kind: 'group'; combinator: 'AND' | 'OR' | 'NOT'; children: Condition[] };
```

**Three things to nail (and document — the spec is vague here on purpose):**

1. **Evaluation is one pure recursive function.** `evaluate(rule, answers): boolean`. `NOT` takes the negation of its (single, or all-AND'd) children. Unit-test this hard — cheapest, highest-value test surface.

2. **Operators are filtered by target question type** in the UI. The operator dropdown only offers operators valid for the referenced question's type. Keep a `operatorsByType` map in the shared package so UI and server agree.

3. **The semantic trap — handle on the server:**
   - A hidden question is **not required**, and its answer is dropped from the submission.
   - The server re-runs visibility at submit time (`requiredVisibleQuestions(form, answers)`) before validating required fields. Never trust the client's view of visibility.
   - Rules reference **earlier questions only** → evaluation is a single forward pass, no cycles possible.

**The recursive builder UI is the real time sink** — not the engine. A `<ConditionNode>` component that renders itself for groups, with add-leaf / add-group / remove / toggle-combinator, plus a live human-readable summary (e.g. *"Show when Q1 contains 'yes' AND (Q2 is answered OR Q3 includes 'A')"*). Budget more time here than for the evaluator.

---

## 6. Build Order (thin slice first)

Get phases 1–6 working end-to-end **before** any polish or the bonus.

### Phase 0 — Foundation (de-risk deploy immediately)
- [ ] npm-workspaces monorepo: `backend`, `frontend`, `shared/schemas`
- [ ] `@alsun/schemas` builds and imports cleanly in both apps
- [ ] Sequelize models + sync (creates the initial tables)
- [ ] Deploy a "hello" of API (Railway + Postgres + volume) and web (Vercel). **Confirm the volume persists a test file across a redeploy.**

### Phase 1 — Form CRUD + Builder
- [ ] Auth: login endpoint, signed cookie, `requireAuth` hook on `/api/forms/*`
- [ ] Create / list / rename / delete forms
- [ ] Add / edit / delete questions (text, MCQ with options, file)
- [ ] Reorder via `orderedIds` (rewrite positions in a transaction)
- [ ] Builder UI: form list, form editor, question editor with type-specific config

### Phase 2 — Publishing
- [ ] Publish toggle; mint `public_token` on first publish
- [ ] `GET /api/public/forms/:token` returns published form only (404 if draft)

### Phase 3 — Public Submission
- [ ] Public render page (renders questions from token)
- [ ] Two-step file upload to volume → `fileId`
- [ ] `POST .../submissions` with **server-side** required validation + per-type value validation
- [ ] Persist submission + answers + link files

### Phase 4 — Submission Viewing
- [ ] Dashboard: summarized submission list per form
- [ ] Submission detail: full answers + file download links (`/api/files/:id`, auth-gated)

### Phase 5 — Hardening
- [ ] Vitest/Jest: validation + (later) evaluator
- [ ] Error states, empty states, basic styling pass
- [ ] README: setup, run, deploy URL, assumptions, scope cuts

### Phase 6 — Bonus (only after 1–5 are solid)
- [ ] `Condition` types + `operatorsByType` in shared package
- [ ] Pure `evaluate()` + `requiredVisibleQuestions()` + heavy unit tests
- [ ] Server: re-evaluate visibility at submit; drop hidden answers; skip hidden required
- [ ] Public page: live show/hide as the respondent answers
- [ ] Recursive `<ConditionNode>` builder UI + human-readable summary

---

## 7. Testing Strategy

Keep it targeted — don't aim for coverage, aim for the load-bearing logic:
- **`evaluate()`** — the single highest-value suite. Nested AND/OR/NOT, each operator, missing answers.
- **Submission validation** — required enforced, hidden-required skipped, per-type value shapes.
- A couple of API integration smoke tests (create → publish → submit → read) if time allows.

---

## 8. Deployment

| Component | Platform | Notes |
|---|---|---|
| Frontend (SPA) | Vercel | Static build; env var points to API URL |
| Backend (Fastify) | Railway | Long-running; handles multipart cleanly |
| Database | Railway Postgres (or Neon) | |
| File storage | Railway volume mounted at `/uploads` | Confirm volume support on your current plan |

**Production-correct alternative to note in README:** object storage (Cloudflare R2 / Supabase) decouples files from the compute host and is what you'd reach for in production. Volume is the deliberate take-home simplification.

CORS: lock API to the Vercel origin. Set the cookie `SameSite`/`Secure` correctly for cross-origin auth.

---

## 9. README Checklist (the deliverable's front door)

- [ ] One-paragraph overview + screenshot/GIF
- [ ] Local setup (env vars, `npm install`, migrate, `npm run dev`)
- [ ] **Live URL**
- [ ] Architecture summary (the monorepo + shared schema story)
- [ ] **Assumptions & deliberate scope cuts** (single user, no versioning, earlier-question-only rules, volume vs object storage)
- [ ] Bonus: how the rule engine works + the hidden→not-required decision
- [ ] What you'd do next with more time

> The "assumptions & scope cuts" section is disproportionately high-signal: it shows you made deliberate engineering tradeoffs rather than ran out of time.
