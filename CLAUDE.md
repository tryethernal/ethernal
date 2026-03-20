# CLAUDE.md

## Quick Reference

| Task Type | Key Files | Reference |
|-----------|-----------|-----------|
| API endpoint | `run/api/[feature].js`, `run/lib/firebase.js`, `src/plugins/server.js` | [PATTERNS.md](.claude/references/PATTERNS.md) |
| New model | `run/models/`, `run/migrations/`, `run/lib/firebase.js` | [PATTERNS.md](.claude/references/PATTERNS.md) |
| Background job | `run/jobs/[name].js`, `run/jobs/index.js`, `run/lib/queue.js` | [QUEUES.md](.claude/references/QUEUES.md) |
| Frontend component | `src/components/`, `src/stores/`, `src/plugins/router.js` | [PATTERNS.md](.claude/references/PATTERNS.md) |
| Auth/onboarding | `src/components/OnboardingWizard.vue` (unified auth+onboarding), `run/api/onboarding.js`, `run/api/users.js` (signin) | |
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
| Analytics (PostHog) | `blog/src/layouts/BaseLayout.astro` (snippet), `landing/src/main.js` (init), `run/lib/analytics.js` (backend) | PostHog personal API key in `.credentials.local` |
| Docker commands | | [COMMANDS.md](.claude/references/COMMANDS.md) |
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

**CRITICAL: Always serve frontends (landing, blog, app) from Docker containers, never standalone `npx vite dev` or `npm run dev` outside Docker.** The Docker containers use named volumes for `node_modules`, have correct Node versions, and match the dev environment the user expects. To start a frontend: `docker compose -f docker-compose.dev.yml up landing -d`.

**Local dev via Caddy (port 8180):** All apps are accessible through a single Caddy reverse proxy:
- `ethernal.local:8180` → landing
- `app.ethernal.local:8180` → app frontend (auth, onboarding, dashboard)
- `ethernal.local:8180/blog` → blog
- `ethernal.local:8180/api/*` → backend API
- Raw container ports: landing=8174, blog=8176, app=8080, backend=8888

Start everything: `docker compose -f docker-compose.dev.yml up postgres redis backend frontend soketi high_priority_worker pgbouncer landing blog caddy -d`

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

### Auth & Onboarding Flow

**`/auth` is the single entry point** for both sign-in and onboarding. `OnboardingWizard.vue` handles everything:
- Default view: sign-in form (+ forgot password, reset password)
- "Get Started" transitions inline to the wizard steps (no route change)
- Landing CTAs with `?flow=public` or `?flow=private` skip sign-in and enter wizard directly
- Sign-in returns a JWT token via `POST /api/users/signin`
- Onboarding creates user+workspace+explorer atomically via `POST /api/onboarding/setup`

### Authorization Flow

1. **authMiddleware** — Validates JWT Bearer token or Firebase auth token, sets `req.body.data.user` and `req.body.data.uid`
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
- **Cross-app URLs:** Landing and app live on different subdomains (`tryethernal.com` vs `app.tryethernal.com`). Use `__APP_URL__` global in the landing app (defined in `landing/vite.config.js`, defaults to `https://app.tryethernal.com`). In the blog (Astro), use `import.meta.env.PUBLIC_APP_URL` (defaults to `https://app.tryethernal.com`, set via `PUBLIC_APP_URL` env var in Docker). API calls (`/api/*`) can be relative since Caddy proxies them on every subdomain. Absolute URLs are only for external services (docs, GitHub, Discord).
- **Blog footer must match landing footer** (`landing/src/components/LandingFooter.vue`). When adding links, columns, or changing structure in the landing footer, mirror the changes in the blog footer (`blog/src/components/Footer.astro`).
- **Enterprise contact modal** exists in both the app (`src/components/OnboardingEnterpriseModal.vue`) and landing (`landing/src/components/EnterpriseContactModal.vue`). Both use the same design and hit `POST /api/onboarding/contact`. Keep them in sync when updating.

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

### Chain Directory Pages

**Existing pages:** 18 chain pages in `landing/src/pages/chains/` + 2 framework pages (`OpStackPage.vue`, `OrbitPage.vue`). Each is a standalone Vue SFC with hero (overline + title + description + stats strip with chain logo in first pill), 2 FeatureSections with mockups, ChainFeatureGrid, setup steps, comparison table, pricing, FAQ, related links, and full structured data (Product + HowTo + BreadcrumbList + FAQPage).

**When adding a new chain page:**
1. Create `landing/src/pages/chains/<ChainName>Page.vue` following `BasePage.vue` as reference
2. Add route in `landing/src/router.js`
3. Add chain logo SVG to `landing/public/images/chains/<slug>.svg`
4. Add footer link in `LandingFooter.vue` (row 2, appropriate Chains column)
5. Check if the chain is more prominent than current "Popular Chains" in the header mega menu (`LandingNavbar.vue`). If so, swap it in. Current popular: Base, Optimism, Arbitrum One, Blast, Sepolia.
6. Add chain card link on the framework page (`OpStackPage.vue` or `OrbitPage.vue`) in the "Chains Built on..." section
7. Update `landing/public/llms.txt` with the new chain entry under "## Supported Chains"
8. Sitemap is auto-generated from routes at build time

**Feature-gated pages (pending):**
- **ZK chains** (zkSync Era, Scroll, Linea, Polygon zkEVM, Mantle): Build once ZK-specific features are implemented (ZK proof verification, batch posting, etc.).
- **Polygon CDK chains**: Build once Polygon CDK support is fully implemented.

---

## Pricing

**CRITICAL: When writing pricing-related content (landing pages, FAQs, schema, emails), always verify against the actual plans in the database. Do NOT make up plan names, prices, or features.**

### Checking Plans in the DB

```bash
# Connect to production DB (credentials in .credentials.local)
psql -d ethernal -U postgres -p 5432 -h postgresqlprod.tryethernal.com
# Query active public plans
SELECT name, slug, price, capabilities FROM stripe_plans WHERE public = true ORDER BY price;
```

### Current Plans (as of 2026-03-17)

**Public Explorers:**

| Plan | Price | Slug | Key Features |
|------|-------|------|-------------|
| Starter | $0 | `free` | Ad-supported, contract verification, token/NFT tracking, testnet faucet, Ethernal branding, unlimited tx |
| Team | $150/mo | `explorer-150` | Custom domain, native token, L1 explorer, no ads, 100k tx included |
| App Chain | $500/mo | `explorer-500` | Full whitelabel: custom branding, status page, total supply, custom fields, L1 explorer, 5M tx |
| Enterprise | Custom | `enterprise` | Custom requirements, high tx volume, custom parts |

**Private Explorers (local dev):**

| Plan | Price | Slug | Key Features |
|------|-------|------|-------------|
| Free | $0 | (default) | 1 workspace, unlimited blocks, tx decoding/tracing, contract interaction, Hardhat/Anvil sync, analytics |
| Pro | $20/mo | (in-app) | Everything in Free + unlimited workspaces |

**Partner/White-label plans** (not public): Quicknode, Buildbear, Magma, UZH — each with custom capabilities. Check DB for details.

**Subscription statuses:** `trial` (no card, auto-cancels at end), `trial_with_card` (will convert to paid), `active` (paying or free-tier). Partner plans (Buildbear, Demo, Quicknode, etc.) are `active` with no `stripeId`. Only subscriptions with a `stripeId` represent real Stripe billing. **Self-serve plans** are only: `free` (Starter), `explorer-150` (Team), `explorer-500` (App Chain). All other plans are partner/custom — filter by these slugs when analyzing organic signups and trials.

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

**CRITICAL: Process the PR summary comment too** — the PR conversation comment (Step 4) often contains a summary with additional issues not raised as inline comments. Parse the full summary body for all mentioned issues (look for bullet points, "Key issues found", "Issues found", warnings). These are easy to miss because they're in prose, not standalone inline comments.

**Verification pass after fixing:** After fixing all identified issues, do a final cross-check before pushing:
1. Re-read the full PR summary comment body
2. Make a checklist of every issue mentioned (inline comments AND summary)
3. Verify each issue has been addressed in the code
4. Only then push the fix commit

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

**Blog/landing/frontend changes auto-deploy on push to `develop`** via GitHub Actions CI. Do NOT manually run `/deploy` for blog-only or landing-only changes (images, articles, static content). Just push to `develop` and CI handles the rest.

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
