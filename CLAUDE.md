# CLAUDE.md

## Quick Reference

| Task Type | Key Files | Reference |
|-----------|-----------|-----------|
| API endpoint | `run/api/[feature].js`, `run/lib/firebase.js`, `src/plugins/server.js` | [PATTERNS.md](.claude/references/PATTERNS.md) |
| New model | `run/models/`, `run/migrations/`, `run/lib/firebase.js` | [PATTERNS.md](.claude/references/PATTERNS.md) |
| Background job | `run/jobs/[name].js`, `run/jobs/index.js`, `run/lib/queue.js` | [QUEUES.md](.claude/references/QUEUES.md) |
| Frontend component | `src/components/`, `src/stores/`, `src/plugins/router.js` | [PATTERNS.md](.claude/references/PATTERNS.md) |
| Auth/permissions | `run/middlewares/auth.js`, `run/middlewares/workspaceAuth.js` | |
| L2 integrations | `run/lib/orbit*.js`, `run/lib/op*.js`, `pm2-server/logListener.js` | [L2.md](.claude/references/L2.md) |
| Billing/Stripe | `run/webhooks/stripe.js`, `run/lib/stripe.js`, `run/api/stripe.js` | |
| Testing | `run/tests/mocks/`, `run/tests/api/`, `tests/unit/` | [PATTERNS.md](.claude/references/PATTERNS.md) |
| Database schema | `.claude/references/SCHEMA.md` | |
| Infra monitoring | `run/jobs/infraHealthCheck.js`, `run/api/status.js`, `scripts/redis-health.sh` | |
| Auto-remediation | `.github/workflows/infra-auto-remediation.yml`, `run/jobs/infraHealthCheck.js` | |
| Sentry pipeline | `run/api/sentryPipeline.js`, `run/webhooks/githubActions.js` | [SENTRY.md](.claude/references/SENTRY.md) |
| Landing/marketing | `landing/` | [LANDING.md](.claude/references/LANDING.md) |
| Blog pipeline | `blog/pipeline/`, `.github/workflows/blog-*.yml` | [MARKETING.md](.claude/references/MARKETING.md) |
| Drip emails | `run/jobs/sendDripEmail.js`, `run/jobs/processDripEmails.js`, `run/emails/drip-content.js` | [MARKETING.md](.claude/references/MARKETING.md) |
| Demo enrichment | `run/jobs/enrichDemoProfile.js`, `run/lib/enrichment.js` | [MARKETING.md](.claude/references/MARKETING.md) |
| Twitter pipeline | `tweet-pipeline/` (standalone, Hetzner server) | [MARKETING.md](.claude/references/MARKETING.md) |
| Analytics (PostHog) | `blog/src/layouts/BaseLayout.astro` (snippet), `landing/src/main.js` (init) | |
| Docker commands | | [COMMANDS.md](.claude/references/COMMANDS.md) |
| Infra monitoring | `run/jobs/infraHealthCheck.js`, `run/api/status.js`, `.github/workflows/infra-auto-remediation.yml` | |
| Worker watchdog | `scripts/watchdog.sh`, `scripts/watchdog-diagnose.md`, `run/lib/heartbeat.js` | |
| Env vars/flags | `run/lib/flags.js` | [ENV.md](.claude/references/ENV.md) |

**Critical architectural rules:**
- **Authorization** happens in middleware (`authMiddleware`, `workspaceAuthMiddleware`) — NOT in firebase.js
- **firebase.js** is a data access layer abstracting Sequelize models
- **Workspace** is the multi-tenancy boundary — all queries filter by workspaceId

---

## Project Overview

Ethernal is an open-source block explorer for EVM-based chains. Vue 3 frontend + Node.js/Express backend + PostgreSQL + Redis/BullMQ.

**All local dev commands run through Docker Compose.** Never run `npm`/`yarn` directly. Always: `docker compose -f docker-compose.dev.yml exec <service> <command>`. See [COMMANDS.md](.claude/references/COMMANDS.md) for all commands.

---

## Architecture

### Caddy Reverse Proxy (Fly.io)

All traffic goes through Caddy (`ethernal-caddy` app, `fly.caddy.toml`):

| Path | Target |
|------|--------|
| `/ingest/*` | `us.i.posthog.com` (PostHog analytics proxy) |
| `/api/2/*`, `/api/3/*` | `sentry.tryethernal.com` (Sentry) |
| `/api*` | `ethernal.internal:8080` (backend) |
| `/app*` | `ethernal-soketi.internal:6001` (websocket via 6PN) |
| `/bull*` | `ethernal.internal:8080` (queue UI) |
| `tryethernal.com` | `/srv/landing` (landing site) |
| Everything else | `/srv/app` (app frontend) |

Key files: `Caddyfile`, `Dockerfile.caddyfile`, `fly.caddy.toml`

**WebSocket path — DO NOT CHANGE:** Caddy uses `handle /app*` (NOT `handle_path`) to preserve the `/app` prefix. The frontend Pusher client (`src/plugins/pusher.js`) must NOT set `wsPath` — pusher-js already generates `/app/{key}` by default. Setting `wsPath: '/app'` causes a double prefix (`/app/app/{key}`) resulting in 404s.

### Request Flow

```
Vue Component → $server plugin (src/plugins/server.js) → HTTP →
API Route (run/api/*.js) → Middleware (sets req.body.data.user, req.query.workspace) →
firebase.js (data access) → Sequelize Models → Optional: enqueue background job
```

### Entity Hierarchy

```
User → Workspace (many) → Explorer (1), Block/Transaction/Contract/TokenTransfer (many),
                           OrbitChainConfig (1), OpChainConfig (1)
```

### Authorization Flow

1. **authMiddleware** — Validates Firebase token or API key, sets `req.body.data.user` and `req.body.data.uid`
2. **workspaceAuthMiddleware** — Extends authMiddleware, validates user owns workspace, sets `req.query.workspace`

### Error Handling

```javascript
managedError(new Error('msg'), req, res);              // Expected errors (400)
unmanagedError(error, req, next);                       // Unexpected (500, Sentry)
managedWorkerError(error, jobName, jobData, workerName); // Job errors
```

---

## Production Database Operations

1. **Always check row counts first** before DELETE/UPDATE
2. **Batch large operations** in chunks of 10K to avoid connection timeouts (~2-3 min limit)
3. **Check FK dependencies** before deleting
4. **Use `SET CONSTRAINTS ALL DEFERRED`** inside transactions for cross-table deletes

### Large Tables — Use `CREATE INDEX CONCURRENTLY`

Tables with 10M+ rows: `transaction_logs` (~257M), `blocks` (~173M), `transactions` (~139M), `token_transfers` (~96M), `token_transfer_events` (~96M), `transaction_receipts` (~93M), `token_balance_changes` (~76M).

**TimescaleDB hypertables:** `blocks`, `transactions`, `transaction_receipts`, `transaction_logs`, `token_transfer_events`, `token_balance_changes` are hypertables partitioned by `timestamp`. Queries without a `workspaceId` filter scan all chunks (hundreds of seq scans). Always ensure indexes cover `workspaceId` + filter columns.

```javascript
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_name ON table_name (column)'
        );
    },
    async down(queryInterface) {
        await queryInterface.sequelize.query('DROP INDEX CONCURRENTLY IF EXISTS idx_name');
    }
};
module.exports.config = { transaction: false }; // CONCURRENTLY fails inside transactions
```

Always use `IF NOT EXISTS`/`IF EXISTS` for re-runnability. For tables < 1M rows, standard `CREATE INDEX` is fine.

---

## Code Style

- Use `@/` alias for imports from `src/` in frontend code
- Fix Vue console warnings (`[Vue warn]`)
- Preserve existing code comments unless completely irrelevant after changes
- Delete one-off scripts after use
- Always use sequelize migrations, never raw SQL for schema changes
- Use `withTimeout(promise, ms)` from `run/lib/utils` instead of inline `Promise.race` timeout patterns
- Pin GitHub Actions to commit SHAs (not mutable tags) when secrets are in scope
- **CRITICAL: Never hardcode API keys, tokens, passwords, or credentials in ANY file that could be committed** — this includes plan files (`docs/`), scripts, YAML, CLAUDE.md, shell commands, and code. Even files in `.gitignore` can be force-added accidentally. Always reference credentials by variable name only (e.g. "see `.credentials.local`" or "see memory file `infra-monitoring.md`"). Store actual values ONLY in `.credentials.local` (gitignored) or memory files (outside the repo). **This repo is PUBLIC — any committed credential requires immediate rotation.**

## Documentation Requirements

All new files and functions must include JSDoc (`/**` format). Vue components: `@fileoverview`, `@component`, `@prop`, `@emits` before `<script>`. Backend: `@param`, `@returns`, `@throws`.

## Design Resources

Browse quality design components at: https://21st.dev/community/components

## RenderKit

Use RenderKit to render specs, reports, or any structured content as hosted HTML pages.

- **API:** `https://renderkit.live/v1`
- **Docs:** `https://renderkit.live/docs.md`
- **API key:** See `RENDERKIT_API_KEY` in `.credentials.local`
- **Templates:** `freeform` (flexible, works with markdown or structured blocks), `travel_itinerary`
- **Usage:** `POST /v1/render` with `{template, context, data, theme}`. Returns hosted URL.
- **Update:** `PATCH /v1/render/{id}` to refine without changing URL.
- **Theme:** `{"mode": "dark", "colors": {"primary": "#3D95CE"}}` for Ethernal branding

---

## Marketing Pipeline

See [MARKETING.md](.claude/references/MARKETING.md) for complete reference (blog pipeline, Twitter pipeline, drip emails, enrichment, PostHog tracking, server setup, all env vars).

**Quick summary:** Trend scan (weekly, GH Actions) → GitHub Projects board → Blog draft (every 2 days, Hetzner server, 3-phase Claude) → Tweet pipeline (5x/day, Hetzner server, 3-phase Claude) → Drip emails (6-step Mailjet sequence on demo creation) → PostHog tracking flywheel.

**Server:** Hetzner `157.90.154.200`, user `blog`, repo at `/opt/ethernal-blog-stack`, env at `/opt/blog-pipeline.env`.

---

## Workflow

- **Always branch from `develop`**, never from `master`. `develop` is the default branch.
- **Always create a PR after completing work** targeting `develop`.

### Code Review (Greptile / CodeAnt AI)

PRs trigger automated review (Greptile bot: `greptile-apps[bot]`). When processing reviews:

**Wait for review to complete before processing:**
- **Use the check-runs API** to know when Greptile is done: `gh api repos/tryethernal/ethernal/commits/{sha}/check-runs --jq '.check_runs[] | select(.app.slug == "greptile-apps") | {status, conclusion}'`
- Poll every 60s until status is `completed`. Only then fetch and process comments.
- After pushing fixes, the check resets to `in_progress` — poll again for the new commit SHA.

**Fetch ALL comment types — MUST follow this exact procedure:**

**DO NOT use `pulls/{number}/comments` alone** — it misses comments from later review batches. This has caused missed review comments in production.

Step 1: Get all review IDs:
```bash
gh api repos/tryethernal/ethernal/pulls/{number}/reviews --jq '.[].id'
```

Step 2: For EACH review ID, fetch its comments:
```bash
gh api repos/tryethernal/ethernal/pulls/{number}/reviews/{review_id}/comments --jq '.[] | {id, body: .body[:100], reactions: .reactions}'
```

Step 3: Also check review-level bodies (top-level summaries):
```bash
gh api repos/tryethernal/ethernal/pulls/{number}/reviews --jq '.[] | select(.body != "") | {id, body: .body[:100]}'
```

Step 4: Check PR conversation comments:
```bash
gh api repos/tryethernal/ethernal/issues/{number}/comments --jq '.[] | {id, body: .body[:100]}'
```

**Filter for unreacted comments** — only process comments where `reactions["+1"] == 0 AND reactions["-1"] == 0`.

**Process each comment:**
1. Take comments seriously — most are legitimate
2. Verify the issue exists in code before acting
3. Challenge incorrect comments explicitly
4. Never remove working code to satisfy a review bot

**React to EVERY comment** with 👍 (`+1`) if valid/fixed, or 👎 (`-1`) if incorrect:
- Inline comments: `gh api repos/tryethernal/ethernal/pulls/comments/{id}/reactions -f content='+1'`
- PR conversation comments: `gh api repos/tryethernal/ethernal/issues/comments/{id}/reactions -f content='+1'`
- Do this immediately after reading, and retroactively for older unreacted comments

**Review loop — keep iterating until the check-runs API shows `completed`:**
- After each push, poll the check-runs API every 60s until the Greptile check is `completed`
- Only then fetch and process new comments
- After fixing comments and pushing, the check resets — poll again for the new commit
- Never declare "Greptile done" based on absence of new reviews — always use the check-runs status

### End-of-Session Flow

Use `/wrapup` (Ethernal project command) when a branch is ready:
1. `/refactor` — PR-scoped code quality cleanup
2. `/update-claudemd` — Updates docs if new patterns introduced
3. Create PR targeting `develop`

### Release Flow

Use `/deploy` (Ethernal project command) after PRs merged to `develop`:
1. Generates changelog, bumps version, pushes tag to `develop`
2. Syncs `master` with `develop` (`git merge --no-ff`)
3. CI: tests → create_release → run_migrations → deploy

Migrations run automatically in CI. Must be backwards-compatible (additive only).

When user says "merge and deploy": `gh pr merge --squash --admin` first, then deploy.

### Karma Project Updates

Ethernal is registered on [Karma](https://gap.karmahq.xyz/project/ethernal) (Optimism, project UID `0x86803c70b193a5aee05ae4b45b2e1e99eb4f6b39056635f810bfc18ed391d0d5`). After every significant update (new feature, major fix, milestone reached), post a project update via the Karma API using the `project-manager` skill. This builds a public on-chain track record for grant applications. API key env var: `KARMA_API_KEY`.

---

## Infrastructure & Secrets

### K8s Secrets (ExternalSecrets + Azure Key Vault)

K8s secrets in `ethernal-prod` are managed by **ExternalSecrets** syncing from **Azure Key Vault** (`ethernalkeyvault.vault.azure.net`), reconciled by **ArgoCD**. Direct `kubectl patch secret` will be reverted on the next sync cycle. To rotate a secret:

1. Update the source in Azure Key Vault (REST API or `az` CLI)
2. Force ExternalSecret refresh: `kubectl annotate externalsecret <name> -n ethernal-prod force-sync=$(date +%s) --overwrite`
3. Restart the consuming pod to pick up the new value

### Fly.io Apps

| App | Purpose | Redis env var |
|-----|---------|---------------|
| `ethernal` | Main backend (API, workers) | `REDIS_URL` |
| `ethernal-pm2` | PM2 process manager (Orbit listeners) | `ETHERNAL_REDIS_URL` |
| `ethernal-caddy` | Reverse proxy (Caddy) | — |
| `ethernal-soketi` | WebSocket server | — |

### Never Hardcode Credentials in Scripts

Use env vars or CLI arguments. The repo is **public**. Scripts like `scripts/redis-health.sh` must require `REDIS_URL` as input, never embed defaults with credentials.
