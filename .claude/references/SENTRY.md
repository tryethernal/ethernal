# Sentry Error & Performance Monitoring

Self-hosted Sentry (v26.2.1) at `sentry.tryethernal.com`. Server details and credentials in `.credentials.local`.

## Integration Points

- **Backend**: `instrument.js` initializes `@sentry/node` using `SENTRY_DSN` env var (Fly.io secret). Uses a custom `tracesSampler` that samples 100% of API requests (`GET/POST/PUT/DELETE /api*`) and 10% of everything else — ensures slow user-facing queries always appear in performance monitoring. Workers wrap jobs in `Sentry.startSpan()` with `op: 'queue.process'` for Queue Monitoring.
- **Frontend**: `@sentry/vue` initialized in `main.js` using `VITE_SENTRY_*` env vars. These are passed as build args to `Dockerfile.caddyfile` from GitHub secrets in CI.
- **Queue monitoring**: `enqueue()` in `run/lib/queue.js` wraps with `op: 'queue.publish'` spans. All 4 workers use `op: 'queue.process'` spans with `messaging.destination.name` and `messaging.message.id` attributes.
- **Proxy**: Caddy on Fly.io proxies `/api/2/*` to `sentry.tryethernal.com` so frontend events route through the explorer's own domain.

## Auto-Fix Pipeline

`.github/workflows/sentry-auto-fix.yml` — Sentry alert rules create GitHub issues with `sentry` label on: new errors (≥2 occurrences in 1h), regressions (previously resolved errors recurring). Claude Code triages (close/escalate/fix), creates fix PRs, processes code review (including Greptile thread resolutions with 30s debounce), merges when approved. Non-hotfix PRs get status `merged` and await batch deploy; issues with `hotfix` label deploy inline immediately. Protected files (Stripe, auth, crypto) are never auto-modified. GitHub App `ethernal-sentry` on `tryethernal` org powers the Sentry-GitHub integration.

**Safeguards**: Dedup check prevents duplicate PRs for the same issue; Greptile confidence threshold (3/5) gates auto-merge (low scores get `needs-human` label); stuck PR recovery job runs every 2h to merge PRs that passed CI but got stuck.

## Batch Deploy

`.github/workflows/sentry-batch-deploy.yml` — hourly cron batches all pending commits since last tag into a single release (changelog, version bump, master sync). Resolves linked Sentry issues and notifies dashboard for each. Also supports `workflow_dispatch` for manual triggers.

## Proactive Scanner

`.github/workflows/sentry-scanner.yml` — single hourly cron job scanning both errors and performance issues (using `statsPeriod=24h` — Sentry v26.2.1 only supports `24h`/`14d`). Also queries `is:regressed` explicitly to prioritize regressions regardless of event count. Claude evaluates which are actionable, creates GitHub issues (feeding into auto-fix pipeline), auto-resolves transient errors. Limited to 3 issues per scan with 90s stagger between creations to prevent workflow storms.

## Sessions Dashboard

Standalone Vue 3 app at `sentry-dashboard/` served at `/sentry-dashboard` path. Three views: **Live** (iTerm-like split panes of active Claude sessions with real-time turn streaming), **History** (paginated table of past sessions), **Session Detail** (full conversation viewer). Protected by HTTP Basic Auth. Real-time updates via Pusher (`turn-added` for incremental conversation turns, `updated` for status changes). Webhook at `POST /webhooks/github-actions` receives status updates and supports `appendTurns` for atomic JSONB array append. Streaming sidecar at `.github/scripts/stream-conversation.sh` polls `claude-execution-output.json` every 5s during GitHub Actions runs. Model: `SentryPipelineRun`. Dev: `docker compose -f docker-compose.dev.yml up -d sentry-dashboard` (port 8175).

## CLI Access

SSH into the Sentry server (see `.credentials.local` for host/IP), then `cd /opt/sentry && docker compose --env-file .env --env-file .env.custom exec -T web sentry shell` for Django shell access. API token with full scopes stored as `SENTRY_API_TOKEN` GitHub secret.
