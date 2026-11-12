# Self-hosted: jobs enqueued onto hosted-only queues crash (GitHub #1403)

## Problem

On self-hosted instances (`SELF_HOSTED=true`), `run/workers/priorities.js` does not register the
hosted-only queues (`updateApproximatedRecord`, `increaseStripeBillingQuota`, `sendDemoExplorerLink`,
`sendDripEmail`, `processDripEmails`, `enrichDemoProfile`). (`processDetectedProspects` and `enrichProspect`
are also pushed in that block, but they are already registered unconditionally in `priorities.low`, so they
are NOT hosted-only; on hosted they currently appear twice — see Non-goals.)
`run/queues.js` therefore has no entry for them, and `enqueue()` / `bulkEnqueue()` in `run/lib/queue.js`
crash with `TypeError: Cannot read properties of undefined (reading 'add')` when called with one.

Observed effect (#1403): `run/jobs/removeStalledBlock.js` enqueues `increaseStripeBillingQuota` for every
healthy block. On self-hosted that throws, the job retries 15 times (high-priority `attempts`), ~900
errors/hour at one block/minute. Indexing itself is unaffected.

Same class: earlier instance #887. Other current callers of hosted-only queues are already guarded
(e.g. `run/models/explorerdomain.js` create/destroy hooks return early on self-hosted), so the central
guard in C is defence against future unguarded callers.

## Goals

1. `removeStalledBlock` never enqueues `increaseStripeBillingQuota` on self-hosted.
2. Enqueueing onto a hosted-only queue on a self-hosted instance is a silent, logged no-op instead of a
   crash (defence for future unguarded callers).
3. Enqueueing onto a queue name that is not registered at all (typo, missing registration) fails with a
   clear error naming the queue, not a `TypeError`.

## Non-goals

- No change to hosted behaviour (all queues registered there; same code paths run).
- No changes to which queues are hosted-only.
- Not removing the duplicate hosted registration of `processDetectedProspects` / `enrichProspect` (it
  changes hosted worker concurrency; separate decision). `priorities` content must stay exactly as today.

## Design

### A. Single source of truth for hosted-only queue names

New module `run/workers/hostedOnlyQueues.js`:

```js
/** Queues registered only when not self-hosted, by priority tier. */
module.exports = {
    high: ['updateApproximatedRecord', 'increaseStripeBillingQuota'],
    low: ['sendDemoExplorerLink', 'sendDripEmail', 'processDripEmails', 'enrichDemoProfile'],
};
```

`run/workers/priorities.js` replaces its hard-coded lists with `priorities.high.push(...hostedOnly.high)` /
`priorities.low.push(...hostedOnly.low, 'processDetectedProspects', 'enrichProspect')` inside the existing
`if (!isSelfHosted())` block (the trailing two kept verbatim to preserve today's hosted content). Resulting
`priorities` object is byte-for-byte identical in content and order to today's (the keys `high`/`medium`/
`low` only — do NOT add properties to `priorities`, several modules iterate it).

### B. Job-level guard in `removeStalledBlock`

```js
else if (!isSelfHosted()) {
    await enqueue('increaseStripeBillingQuota', ...same args...);
}
return true;
```

`isSelfHosted` from `run/lib/flags`. Return value stays `true` in both cases.

### C. Guard in `enqueue` and `bulkEnqueue` (`run/lib/queue.js`)

At the top of both functions, before cap logic and before touching Redis:

```js
if (!queues[queueName]) {
    if (isSelfHosted() && isHostedOnlyQueue(queueName)) {
        logger.debug('Skipping enqueue on hosted-only queue (self-hosted)', { queueName, location: 'lib.queue.enqueue' });
        return null;                                   // bulkEnqueue: return { attempted, accepted: 0, dropped: attempted }
    }
    throw new Error(`Queue "${queueName}" is not registered`);
}
```

- `isHostedOnlyQueue(name)` = name is in `hostedOnly.high` or `hostedOnly.low` (from module A).
- Return contracts unchanged: `enqueue` already returns `null` for cap drops; `bulkEnqueue` already returns
  `{attempted, accepted, dropped}`.
- `bulkEnqueue`'s existing early return for empty input stays first (an empty bulk on an unknown queue is
  still a no-op, unchanged behaviour).
- `logger.debug` (not warn; Winston logger in `run/lib/logger.js` has it): with B in place nothing current
  hits this path. Not sent to Sentry.
- The guard runs before any cap check / `queueCaps` call / queue method.

## Tests (Jest, `run/tests/`)

1. `tests/jobs/removeStalledBlock.test.js`: existing hosted cases unchanged (they must still assert the
   `increaseStripeBillingQuota` enqueue). New: with `SELF_HOSTED=true` (set/restore `process.env` in the
   test), a non-reverted block does NOT call `enqueue` and returns `true`.
2. `tests/lib/queue.test.js` (add `debug: jest.fn()` to the existing logger mock):
   - `enqueue` on an unregistered, non-hosted-only name throws `Queue "nope" is not registered`.
   - `enqueue` on `increaseStripeBillingQuota` with `SELF_HOSTED=true` and no registered queue resolves
     `null`, no throw.
   - `enqueue` on `increaseStripeBillingQuota` with `SELF_HOSTED` unset and no registered queue throws
     (hosted misconfiguration must stay loud).
   - Same three cases for `bulkEnqueue` (self-hosted returns `{attempted: n, accepted: 0, dropped: n}`).
   - In the self-hosted skip cases, assert no `queueCaps` function was called.
   - Existing queue tests still pass.
3. `tests/workers/priorities.test.js` (new, small): with `SELF_HOSTED` unset, `priorities` deep-equals
   today's content (snapshot the exact arrays in the test, including the duplicate prospect entries); with
   `SELF_HOSTED=true` none of the six hosted-only names in module A are present and `processDetectedProspects`
   / `enrichProspect` appear exactly once. Use `jest.isolateModules` to re-require under each env.

## Libraries considered

| Need | Chosen | Considered / why rejected |
|------|--------|---------------------------|
| Job queue | BullMQ 5.77.3 (already in stack) | — no new library; the bug is a missing registration guard, not a queue feature |
| Skipping unavailable queues | Own 5-line guard | BullMQ has no notion of "optional queue"; no library exists for a membership check against our own registry (trivially small) |

## Rollout

Backwards compatible, no migration, no env change. Ships in the next backend release; self-hosters pick it
up with the new image tag.
