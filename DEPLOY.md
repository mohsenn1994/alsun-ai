# Deployment

Backend (Fastify) → **Railway**, with a Postgres database and a persistent volume.
Frontend (Vite SPA) → **Vercel**. These steps require logging into your own
Railway and Vercel accounts.

## 1. Database (Railway Postgres)

1. Create a Railway project.
2. **+ New → Database → PostgreSQL.** Railway exposes a `DATABASE_URL`.
3. (Alternative: a free Neon database — just copy its connection string.)

## 2. Backend service (Railway)

1. **+ New → GitHub Repo**, select this repo. Railway picks up `railway.toml`
   and builds with the root `Dockerfile`.
2. **Variables** — set:

   | Variable          | Value                                                       |
   |-------------------|-------------------------------------------------------------|
   | `DATABASE_URL`    | reference the Postgres service's `DATABASE_URL`             |
   | `WEB_ORIGIN`      | your Vercel URL, e.g. `https://alsun.vercel.app`            |
   | `UPLOAD_DIR`      | `/uploads`                                                  |
   | `AUTH_USERNAME`   | your chosen creator username                                |
   | `AUTH_PASSWORD`   | a strong password                                           |
   | `COOKIE_SECRET`   | a long random string (e.g. `openssl rand -hex 32`)          |
   | `PORT`            | Railway sets this automatically — don't override            |

3. **Volume** — in the service: **Settings → Volumes → add a volume mounted at
   `/uploads`.** This is what makes uploaded files survive redeploys.
4. Deploy. The start command applies migrations, then boots the server.

### Verify the backend

```bash
curl https://<your-backend>.up.railway.app/health          # {"status":"ok",...}
curl https://<your-backend>.up.railway.app/health/ready     # {"status":"ok","db":"up"}
curl https://<your-backend>.up.railway.app/health/storage   # {"ok":true,"dir":"/uploads"}
```

**Confirm volume persistence (the important check):** after `/health/storage`
returns ok, trigger a redeploy and curl it again. It should still return ok,
and the volume should retain files written between deploys. If `dir` is not
`/uploads`, the `UPLOAD_DIR` variable or the volume mount path is wrong.

## 3. Frontend (Vercel)

1. **Add New → Project**, import this repo.
2. **Root Directory → `frontend`.** Vercel detects the npm workspace and Vite.
3. **Environment Variables:** `VITE_API_URL` = your Railway backend URL
   (e.g. `https://<your-backend>.up.railway.app`).
4. Deploy. `vercel.json` handles the SPA fallback so client-side routes resolve.

### Verify end-to-end

Open the Vercel URL. The page reads `/health/ready` from the API and should show
`db: up`. If you see a CORS error, `WEB_ORIGIN` on the backend doesn't match the
Vercel origin.

## Notes

- `db:migrate` runs on every deploy and is idempotent — it calls Sequelize's
  `sync()`, which creates any tables that don't yet exist but does not diff or
  alter existing columns. There's no migration-file/tracking system; schema
  changes to existing tables need a manual `ALTER TABLE` or a model change
  that still validates against existing data.
- `UPLOAD_DIR` defaults to `./uploads` locally and `/uploads` in the image.
