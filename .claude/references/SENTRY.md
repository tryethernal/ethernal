# Sentry Error & Performance Monitoring

Hosted Sentry (`sentry.io`, org `antoine-0l`, Developer plan) with projects `ethernal-backend` and `ethernal-frontend`. Migrated off the self-hosted instance 2026-07-28. Credentials in `.credentials.local`.

## Quota

The Developer plan allows **5M spans and 5k errors per month**, with on-demand spend set to 0 — once a quota is hit, data is dropped rather than billed. Sampling is therefore a correctness concern, not a cost one: over-sampling means going blind for the rest of the billing period.

## Integration Points

- **Backend**: `instrument.js` initializes `@sentry/node` using `SENTRY_DSN` env var (Fly.io secret). A custom `tracesSampler` applies, in order: infrastructure noise (`/api/caddy/validDomain`, `/bull`) is dropped entirely; an upstream sampling decision is honoured to keep distributed traces whole; background queue jobs (identified by the `messaging.destination.name` attribute) sample at 0.1%; user-facing `/api*` routes sample at 5%; everything else at 1%. All three rates are overridable via `SENTRY_API_SAMPLE_RATE`, `SENTRY_QUEUE_SAMPLE_RATE` and `SENTRY_DEFAULT_SAMPLE_RATE` so the budget can be corrected without a release. Workers wrap jobs in `Sentry.startSpan()` with `op: 'queue.process'` for Queue Monitoring.
- **Profiling is deliberately off.** The plan's profile duration quota is 0, so every profile sent was rate-limited and discarded. `@sentry/profiling-node` remains in `package.json` but is no longer initialized.
- **Frontend**: `@sentry/vue` initialized in `main.js` using `VITE_SENTRY_*` env vars. These are passed as build args to `Dockerfile.caddyfile` from GitHub secrets in CI.
- **Queue monitoring**: `enqueue()` in `run/lib/queue.js` wraps with `op: 'queue.publish'` spans. All 4 workers use `op: 'queue.process'` spans with `messaging.destination.name` and `messaging.message.id` attributes.
- **Proxy**: Caddy on Fly.io proxies `/api/2/*` to `sentry.tryethernal.com` so frontend events route through the explorer's own domain.

## Auto-Fix Pipeline

`.github/workflows/sentry-auto-fix.yml` — Sentry alert rules create GitHub issues with `sentry` label on: new errors (≥2 occurrences in 1h), regressions (previously resolved errors recurring). Claude Code triages (close/escalate/fix), creates fix PRs, processes code review (including Greptile thread resolutions with 30s debounce), merges when approved. Non-hotfix PRs get status `merged` and await batch deploy; issues with `hotfix` label deploy inline immediately. Protected files (Stripe, auth, crypto) are never auto-modified. GitHub App `ethernal-sentry` on `tryethernal` org powers the Sentry-GitHub integration.

**Safeguards**: Dedup check prevents duplicate PRs for the same issue; Greptile confidence threshold (3/5) gates auto-merge (low scores get `needs-human` label); stuck PR recovery job runs every 2h to merge PRs that passed CI but got stuck.

### Performance Issue Triage

Not every slow query deserves a PR. The pipeline enforces these rules:

1. **Threshold (mandatory first check)**: User-facing endpoints need 50+ events/24h. Background jobs need 100+ events/24h. Below that, close immediately — do not investigate or fix.
2. **Infra issues get `needs-human`**: WebSocket failures, Fly.io instability, DNS/routing, health check issues are infrastructure problems, not code bugs. Tag `needs-human` and escalate — never create code PRs for infra issues.
3. **Index first**: Before restructuring code, check if the right index exists. Most slow queries are a missing index, not a code problem.
4. **Fix hierarchy**: Add index (migration) > tweak query > restructure code. Simple fixes that address root causes beat complex workarounds.
5. **Complexity cap**: Auto-fix PRs for performance issues are limited to 20 lines of logic changes. Anything larger gets `needs-human`.
6. **Group related issues**: Multiple Sentry issues on the same code path get ONE fix, not one PR per symptom.
7. **Verify claims**: The bot must run `git diff` before claiming any fix was made. No fabricated "fixed" statuses.

## Batch Deploy

`.github/workflows/sentry-batch-deploy.yml` — hourly cron batches all pending commits since last tag into a single release (changelog, version bump, master sync). Resolves linked Sentry issues and notifies dashboard for each. Also supports `workflow_dispatch` for manual triggers.

## Proactive Scanner

`.github/workflows/sentry-scanner.yml` — single hourly cron job scanning both errors and performance issues (using `statsPeriod=24h` — Sentry v26.2.1 only supports `24h`/`14d`). Also queries `is:regressed` explicitly to prioritize regressions regardless of event count. Claude evaluates which are actionable, creates GitHub issues (feeding into auto-fix pipeline), auto-resolves transient errors. Limited to 3 issues per scan with 90s stagger between creations to prevent workflow storms.

## Sessions Dashboard

Standalone Vue 3 app at `sentry-dashboard/` served at `/sentry-dashboard` path. Three views: **Live** (iTerm-like split panes of active Claude sessions with real-time turn streaming), **History** (paginated table of past sessions), **Session Detail** (full conversation viewer). Protected by HTTP Basic Auth. Real-time updates via Pusher (`turn-added` for incremental conversation turns, `updated` for status changes). Webhook at `POST /webhooks/github-actions` receives status updates and supports `appendTurns` for atomic JSONB array append. Streaming sidecar at `.github/scripts/stream-conversation.sh` polls `claude-execution-output.json` every 5s during GitHub Actions runs. Model: `SentryPipelineRun`. Dev: `docker compose -f docker-compose.dev.yml up -d sentry-dashboard` (port 8175).

## CLI Access

SSH into the Sentry server (see `.credentials.local` for host/IP), then `cd /opt/sentry && docker compose --env-file .env --env-file .env.custom exec -T web sentry shell` for Django shell access. API token with full scopes stored as `SENTRY_API_TOKEN` GitHub secret.

## Server Configuration

Self-hosted Sentry runs on a single Hetzner box (see `.credentials.local` for host). Config lives in `/opt/sentry/` (forked from `getsentry/self-hosted` v26.2.1). Two files matter for ops:

- `/opt/sentry/.env` — environment overrides
- `/opt/sentry/sentry/config.yml` — Sentry runtime config

### Retention & Storage Policy

This installation is **issues-only** (errors + stacktraces). Performance traces, replays, profiling, feedback, and attachments are all disabled or rejected at ingest.

| Knob | Value | File | Why |
|---|---|---|---|
| `SENTRY_EVENT_RETENTION_DAYS` | `30` | `.env` | Reduced from default 90 to cap Postgres/Clickhouse/Kafka growth |
| `system.options.max-attachment-size` | `0` | `sentry/config.yml` | Drops attachments at ingest. Stops seaweedfs blob store growing (it has no built-in retention) |

**Disabled service containers** (`profiles: [disabled]` in `docker-compose.yml`): replays (`ingest-replay-recordings`, `snuba-replays-consumer`), profiling (`ingest-profiles`, `vroom`, `vroom-cleanup`, `snuba-profiling-*`), cron monitors (`ingest-monitors`, `monitors-clock-tasks`, `monitors-clock-tick`), feedback (`ingest-feedback-events`). Uptime monitoring kept enabled (watches `app.tryethernal.com/api/status/health`).

**Re-apply after Sentry version upgrades**: the upstream `docker-compose.yml` does not preserve our disabled profiles, the `--auto-offset-reset=latest --no-strict-offset-reset` flags on `run consumer` commands (required to survive Kafka retention purges), or the `SENTRY_SYSTEM_SECRET_KEY` line in `.env`. Without these the stack will crash-loop on the next major upgrade.

### Operational Notes

- **Backup PG before retention reductions**: dropping `SENTRY_EVENT_RETENTION_DAYS` triggers the cleanup cron to purge old events on next run.
- **Kafka volume cannot be partially deleted**: removing individual topic dirs while leaving `__cluster_metadata` causes KRaft to fail with NPE on restart. Either wipe `/var/lib/docker/volumes/sentry-kafka/_data/*` entirely or use `kafka-topics --delete`.
- **Compose status lags reality**: after a stack restart, check for containers in `Created` state (not just `Up`) — they failed dependency checks and need `docker rm -f` + `docker compose up -d` to recreate properly.

See incident history in memory file `incident-2026-05-01-hetzner-disk-full.md` for the two disk-full outages that led to this config.
