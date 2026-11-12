# Explorer sync process not restarted when a finished job blocks new ones (GitHub #1404)

## Problem

Every request to start/stop an explorer's sync process enqueues `updateExplorerSyncingProcess` with a
fixed job id:

| Caller | Job id |
|--------|--------|
| `POST /api/explorers/syncExplorers` (`run/api/explorers.js`, called by the PM2 server at boot) | `updateExplorerSyncingProcess-${explorer.id}` (via `bulkEnqueue`, name = jobId) |
| `run/jobs/explorerSyncCheck.js` (every 5 min, scheduler) | `updateExplorerSyncingProcess-${explorer.id}` (via `bulkEnqueue`) |
| `run/models/explorer.js` afterUpdate / afterDestroy hooks | `updateExplorerSyncingProcess-${explorer.slug}` (via `enqueue`, not unique → no jobId) |
| `run/lib/stripe.js` demo migration | `updateExplorerSyncingProcess-${explorer.id}` (via `enqueue`, not unique → no jobId) |

BullMQ silently ignores `add` when a job with that id already exists in **any** state, including
`completed` and `failed`. The high-priority queue options (`run/queues.js`) are
`removeOnComplete: { count: 100, age: 240 }` / `removeOnFail: { count: 50, age: 240 }`; BullMQ only
trims the completed (resp. failed) set when a later job of the same queue finishes into that set, using
that job's retention settings. With a single explorer (typical self-hosted
install) no other job ever finishes, so the first completed job stays in Redis forever and every later
`bulkEnqueue` for that explorer is dropped. After a host/PM2 restart the sync process is never started;
the explorer keeps limping via the 5-minute integrity check (blocks up to ~5 min late, no error logged).

On hosted the queue keeps moving, but the same mechanism can still drop a restart request until some later
job finishes and trims the old one (the 4-minute age is a threshold applied at that moment, not a timer).

## Goals

1. A request for an explorer's sync process is never dropped because an earlier job for the same
   explorer already finished (completed or failed).
2. Concurrent duplicate requests for the same explorer are still collapsed while one is waiting/active
   (keep today's in-flight dedup).
3. Existing instances that already hold a stale finished job self-heal without manual Redis surgery.

## Non-goals

- No change to the other high-priority queues' retention.
- No change to job ids or the `updateExplorerSyncingProcess` job logic itself.
- Not unifying the id-vs-slug job names (out of scope).

## Design

### A. Queue retention for `updateExplorerSyncingProcess` (`run/queues.js`)

After the high-priority loop, override this one queue's default job options so finished jobs are removed
immediately:

- `removeOnComplete: true`, `removeOnFail: true`; every other option identical to the shared
  high-priority defaults (attempts 15, fixed 30s backoff, timeout, stackTraceLimit, stalledInterval,
  maxStalledCount, connection).
- Implementation: build the high-priority `defaultJobOptions` from a shared object and spread an override
  for this queue name inside the existing loop (`jobName === 'updateExplorerSyncingProcess' ? {...} : {}`),
  so there is still exactly one `Queue` instance per name (do not create a second instance and overwrite —
  the `workspaceReset` comment in that file explains why orphaned instances are avoided).

Effect: with `jobId` dedup, BullMQ then dedups only while a job is waiting/delayed/active — goals 1 and 2.
Trade-off accepted: finished jobs of this queue lose their Redis history (no Bull-board inspection or
manual retry). Failures stay visible in logs (and Sentry when configured) via `managedWorkerError` on the
worker `failed` event. Automatic retries are unaffected: `removeOnFail` applies only after the final attempt,
so a job in retry backoff is `delayed` and still dedups.

### B. One-time self-heal of stale finished jobs (`run/jobs/explorerSyncCheck.js`)

Before calling `bulkEnqueue`, remove finished jobs from the queue:

```js
const queue = queues['updateExplorerSyncingProcess'];
await queue.clean(0, 1000, 'completed');
await queue.clean(0, 1000, 'failed');
```

(`Queue#clean(grace, limit, type)` — BullMQ built-in; it only touches the named terminal set, never
waiting/delayed/active jobs.) With A in place these sets are normally empty, so this is a cheap no-op; on an
upgraded instance the stale job is removed on the next successful scheduled check, after which the normal
enqueue in the same run starts the sync process. Wrap the two `clean` calls so a
failure is logged (`logger.warn`, location `jobs.explorerSyncCheck`) and does NOT prevent the enqueue.

`require('../queues')` directly (the queue object, not `lib/queue`). In tests mock `../../queues`.

## Tests (Jest, `run/tests/`)

1. `tests/jobs/explorerSyncCheck.test.js`:
   - existing assertion unchanged;
   - `clean` called with `(0, 1000, 'completed')` and `(0, 1000, 'failed')` before `bulkEnqueue`
     (assert call order via `mock.invocationCallOrder`);
   - when `clean` rejects, `bulkEnqueue` is still called and the job returns `true`.
2. `tests/queues.test.js` (new): with `bullmq` mocked (constructor spy), the `Queue` for
   `updateExplorerSyncingProcess` is constructed exactly once with `defaultJobOptions.removeOnComplete ===
   true` and `removeOnFail === true` and `attempts === 15`; another high-priority queue (e.g. `blockSync`)
   keeps `removeOnComplete: { count: 100, age: 240 }`.
3. Real-Redis verification script (run by the implementer, results in the PR body, script not committed;
   uses a throwaway Redis container and the real `bullmq` package):
   a. Upgrade path: with the OLD options (`{count:100, age:240}`), add `updateExplorerSyncingProcess-1`
      by jobId, let a worker complete it; add a second id and make it fail terminally (attempts: 1). Re-add
      both ids → dropped (reproduces bug). Run `clean(0,1000,'completed')` + `clean(0,1000,'failed')`,
      re-add → both run again.
   b. New options: complete a job, re-add same id → runs again, no finished job left in Redis.
   c. Dedup kept: with a job waiting, separately delayed in retry backoff, and separately ACTIVE (worker
      held mid-processing), `clean` leaves it in place and re-adding the same id is still dropped (active
      case: exactly one execution).
   d. New options, terminal failure: a job exhausting its attempts is removed from Redis; re-adding its
      id runs it again.

## Libraries considered

| Need | Chosen | Considered / why rejected |
|------|--------|---------------------------|
| Retention of finished jobs | BullMQ `removeOnComplete/removeOnFail: true` (built-in, bullmq 5.77.3 already in stack) | BullMQ `deduplication: { id }` option (also built-in, dedups only while not finished, keeps failure history) — would need a queue-specific producer path in `enqueue`/`bulkEnqueue` plus caller changes across 4 call sites; per-queue retention is the smaller change. Cost accepted: no Redis history for this queue's finished jobs |
| Removing stale jobs on upgrade | BullMQ `Queue#clean` (built-in) | Manual `job.remove()` instructions for self-hosters — rejected, silent-failure bug shouldn't need operator action; a DB migration — wrong layer (Redis) |

## Rollout

Backwards compatible, no migration. Queue option changes apply to jobs added after the new code starts.
Release note for self-hosters: upgrading fixes it automatically on the first successful explorer sync check
after start (normally within ~5 minutes); no manual step.
