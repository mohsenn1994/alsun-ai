# Backend (Fastify) image. Build context = repository root.
FROM node:22-slim

WORKDIR /app

# Manifests first for layer caching. The root package-lock.json + the workspace
# package.json files let `npm ci` resolve the @alsun/schemas workspace dependency.
COPY package.json package-lock.json ./
COPY shared/schemas/package.json ./shared/schemas/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install the whole workspace from the lockfile. devDependencies are kept because
# the app runs via tsx and migrations run via the db:migrate script. (A multi-stage
# build could prune the unused frontend deps later; fine as-is for this scope.)
RUN npm ci

# Source needed to run the API (frontend source isn't required for the backend).
COPY tsconfig.base.json ./
COPY shared/schemas ./shared/schemas
COPY backend ./backend

ENV NODE_ENV=production
ENV PORT=3000
# Point at the mounted volume in production.
ENV UPLOAD_DIR=/uploads
EXPOSE 3000

# Migrations are applied on deploy via the platform start command
# (see railway.toml). The image default just starts the server.
CMD ["npm", "run", "start", "-w", "@alsun/backend"]
