# Ethernal

Open-source block explorer for EVM-based chains. Monorepo with Vue 3 frontend, Node.js/Express backend, PostgreSQL (TimescaleDB), and Redis/BullMQ.

## Project Layout

```
src/              → Vue 3 + Vuetify frontend (Vite, yarn)
run/              → Express backend + Sequelize ORM (npm)
run/api/          → API route handlers
run/lib/          → Core libraries (firebase.js = data access layer)
run/models/       → Sequelize models
run/migrations/   → Database migrations
run/jobs/         → BullMQ background jobs
run/workers/      → BullMQ worker processes
run/middlewares/   → Auth & workspace middleware
run/tests/        → Backend tests (Jest)
tests/unit/       → Frontend tests (Vitest)
landing/          → Marketing site (Vue 3, Vite SSG, npm)
blog/             → Blog (Astro + Tailwind, npm)
pm2-server/       → PM2 process manager for L2 listeners (npm)
tweet-pipeline/   → Twitter automation (shell scripts)
scripts/          → Operational scripts
```

## Build, Lint & Test

All local dev runs through Docker Compose. Never run npm/yarn directly on the host.

```bash
# Start all services
docker compose -f docker-compose.dev.yml up postgres redis backend frontend soketi high_priority_worker pgbouncer landing blog caddy -d

# Frontend tests (Vitest, jsdom, @vue/test-utils)
docker compose -f docker-compose.dev.yml exec frontend yarn test

# Backend tests (Jest, supertest)
docker compose -f docker-compose.dev.yml exec backend npm test tests/

# Frontend lint (ESLint + eslint-plugin-vue + eslint-plugin-vuetify)
docker compose -f docker-compose.dev.yml exec frontend yarn lint

# Backend lint
docker compose -f docker-compose.dev.yml exec backend npx eslint --fix .

# Run single backend test
docker compose -f docker-compose.dev.yml exec backend npx jest tests/api/myTest.test.js

# Database migration
docker compose -f docker-compose.dev.yml exec backend npx sequelize db:migrate
```

If Docker is unavailable, CI runs tests locally:
- Frontend: `yarn && FORCE_COLOR=true vitest run`
- Backend: `cd run && npm install && npm test tests/`

## Architecture

- **Request flow:** Vue → `$server` plugin (src/plugins/server.js) → HTTP → API route (run/api/) → Middleware → firebase.js (data access) → Sequelize models
- **Auth:** JWT via `authMiddleware` and `workspaceAuthMiddleware` (run/middlewares/)
- **Multi-tenancy:** All queries filter by `workspaceId` (Workspace is the boundary)
- **Entity hierarchy:** User → Workspace (many) → Explorer (1) + Blocks/Transactions/Contracts
- **Background jobs:** BullMQ queues (run/jobs/, run/queues.js). Always `throw new Error()` on failure, never return strings.
- **WebSocket:** Soketi (Pusher-compatible). Frontend Pusher client must NOT set `wsPath`.

## Package Managers & Node

- **Root (frontend):** yarn, `type: "module"` (ESM)
- **run/ (backend):** npm, CommonJS
- **landing/:** npm, ESM
- **blog/:** npm, ESM
- **pm2-server/:** **yarn in production Docker** (see `Dockerfile.pm2`), npm locally. Both `yarn.lock` AND `package-lock.json` are committed and must stay in sync — `Dockerfile.pm2` `COPY`s `yarn.lock` explicitly. Do not delete either.
- **Node version:** 18+ (CI), 20 (Docker)

## Conventions

- `@/` alias for imports from `src/` in frontend
- ESLint only (no Prettier): `no-multi-spaces`, `no-trailing-spaces`, `eol-last`, single quotes in backend
- JSDoc on all new files and functions. Vue: `@fileoverview`, `@component`, `@prop`, `@emits`
- Sequelize migrations for all schema changes (never raw SQL). Use `CREATE INDEX CONCURRENTLY` for large tables.
- Error handling: `managedError()` for expected (400), `unmanagedError()` for unexpected (500, Sentry)
- Never hardcode credentials in any file. Repo is PUBLIC.
- `withTimeout(promise, ms)` from `run/lib/utils` instead of inline Promise.race

## Git Workflow

- Branch from `develop` (default branch), never `master`
- PRs target `develop`
- Release: tag on develop → CI runs tests → create_release → run_migrations → deploy to Fly.io
- Blog/landing changes auto-deploy on push to `develop`

## CI/CD

- GitHub Actions: `.github/workflows/test_and_deploy.yml`
- Tests run on every push (frontend + backend in parallel)
- Deploy on version tags (`v*`): Fly.io (backend, Caddy, PM2, Soketi)
- Docker images: multi-arch (amd64 + arm64), pushed to Fly.io registry + Docker Hub

## Key Environment

- Local Caddy proxy: `ethernal.local:8180` (landing), `app.ethernal.local:8180` (app)
- Raw ports: landing=8174, blog=8176, app=8080, backend=8888
- Postgres: TimescaleDB on port 8432 (local), PgBouncer on 8433
- Redis: port 8379 (local)
