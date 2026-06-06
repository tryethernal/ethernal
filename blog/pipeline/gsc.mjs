#!/usr/bin/env node
// gsc.mjs — Google Search Console API client for the Ethernal blog pipeline.
//
// Ported from the ronda blog pipeline (see .claude/references/SERP-INTEGRATION-PLAN.md).
// Default property is `sc-domain:tryethernal.com`.
//
// Provides 5 signal types used to decide whether to write a new post or refresh
// an existing one (consumers wired in a later phase):
//
//   1. siteSnapshot      — last-28d overall clicks / impressions / CTR /
//                          average position. Health-check signal.
//   2. quickWins         — queries ranking position 4–15 with >=50
//                          impressions in 28d. Almost-ranking — the
//                          highest-leverage refresh target.
//   3. contentGaps       — queries with >=20 impressions and position
//                          beyond 20 in 90d. Demand we're not addressing —
//                          new-post candidates.
//   4. contentDecay      — pages whose 28d clicks dropped >=30% vs the
//                          prior 28d window. Refresh candidates.
//   5. ctrOpportunities  — pages whose CTR is materially below the
//                          position-expected baseline (i.e. title/meta
//                          underperforming for the rank they hold).
//
// Output (stdout, JSON):
//   {
//     status: 'ok' | 'skipped',
//     site: 'sc-domain:tryethernal.com',
//     generatedAt: <iso>,
//     siteSnapshot:    { clicks, impressions, ctr, position, rows },
//     quickWins:       [ { query, clicks, impressions, ctr, position } ],
//     contentGaps:     [ { query, impressions, position } ],
//     contentDecay:    [ { page, clicksRecent, clicksPrior, deltaPct } ],
//     ctrOpportunities:[ { page, clicks, impressions, ctr, position,
//                          expectedCtr, gap } ],
//     reason?: '<why we skipped>'   // only when status === 'skipped'
//   }
//
// When the credential is missing OR malformed OR the service-account is
// later revoked, the script prints `{ status: 'skipped', reason: '...' }`
// and exits 0. It NEVER throws — consumers check for `status === 'skipped'`
// and fall through to trend-only behavior.
//
// Auth.
//
// The service account `ethernal@ethernal-493613.iam.gserviceaccount.com`
// (GCP project `ethernal-493613`) owns `sc-domain:tryethernal.com` in Search
// Console. For this repo that SA is the natural owner (no cross-project
// workaround needed). The `webmasters.readonly` scope is sufficient for all
// five signals (Search Analytics is read-only).
//
// Cred resolution order:
//   1. $GSC_KEY_FILE                 (explicit override)
//   2. $GSC_SERVICE_ACCOUNT_JSON_B64 (server runtime — base64-encoded JSON in
//                                    the env file; decoded to a temp file at
//                                    mode 600 and unlinked on exit)
//   3. ~/.credentials/gsc-ethernal.json (inline / local dev)
//
// CLI:
//   node gsc.mjs                                  # default site, all signals
//   node gsc.mjs --site sc-domain:tryethernal.com
//   node gsc.mjs --signal siteSnapshot            # one signal only
//
// Exit codes:
//   0 — ok OR skipped (graceful no-op contract)
//   2 — caller-error (bad --signal flag etc.)

import { google } from 'googleapis';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';

const DEFAULT_SITE = 'sc-domain:tryethernal.com';
const DEFAULT_KEY_FILE = `${process.env.HOME || ''}/.credentials/gsc-ethernal.json`;
const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

// Tunables. Conservative thresholds — we'd rather miss a signal than fire
// a false-positive refresh that wastes a draft cycle on a thin keyword.
const QUICK_WIN_POSITION_MIN = 4;
const QUICK_WIN_POSITION_MAX = 15;
const QUICK_WIN_IMPRESSIONS_MIN = 50;
const QUICK_WIN_DAYS = 28;

const CONTENT_GAP_POSITION_MIN = 20;
const CONTENT_GAP_IMPRESSIONS_MIN = 20;
const CONTENT_GAP_DAYS = 90;

const DECAY_DAYS = 28;
const DECAY_DELTA_THRESHOLD = -0.3; // clicks dropped >=30%
const DECAY_MIN_PRIOR_CLICKS = 5;   // ignore noise on tiny baselines

const CTR_OPPORTUNITY_IMPRESSIONS_MIN = 100;
const CTR_OPPORTUNITY_GAP_THRESHOLD = 0.5; // measured CTR <= 50% of expected
const CTR_OPPORTUNITY_DAYS = 28;

// Position-bucketed expected CTR baseline. Rough industry averages — the
// exact numbers matter less than the relative shape (rank 1 dominates,
// rank 5+ falls off fast). Pages where measured CTR is far below the
// position-expected value are typically a title/meta-description issue.
function expectedCtr(position) {
  if (position < 1.5) return 0.32;
  if (position < 2.5) return 0.18;
  if (position < 3.5) return 0.11;
  if (position < 4.5) return 0.08;
  if (position < 5.5) return 0.06;
  if (position < 7.5) return 0.04;
  if (position < 10.5) return 0.025;
  return 0.012;
}

function log(...args) {
  process.stderr.write(args.map(String).join(' ') + '\n');
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const out = { site: DEFAULT_SITE, signal: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--site') out.site = argv[++i];
    else if (a === '--signal') out.signal = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

// Track every temp credential file ever materialized in this process so the
// process-wide exit/SIGINT/SIGTERM handlers can unlink all of them in one
// pass. Avoids accumulating per-call signal listeners when `fetchGscSignals`
// is imported and called repeatedly by a long-running consumer (PR 1.2's
// `pick-next.mjs`, or future cloud-agent loops).
const TEMP_KEY_FILES = new Set();
let exitHandlersInstalled = false;

// CommonJS `require` for sync unlink in the `exit` handler — ESM has no
// synchronous fs.unlink and `exit` listeners cannot await. Declared before
// `installExitHandlersOnce` (which uses it) to avoid a const TDZ hazard.
const require = createRequire(import.meta.url);

function installExitHandlersOnce() {
  if (exitHandlersInstalled) return;
  exitHandlersInstalled = true;
  const unlinkAll = () => {
    for (const p of TEMP_KEY_FILES) {
      try { require('node:fs').unlinkSync(p); } catch { /* best-effort */ }
    }
    TEMP_KEY_FILES.clear();
  };
  process.on('exit', unlinkAll);
  process.on('SIGINT', () => { unlinkAll(); process.exit(130); });
  process.on('SIGTERM', () => { unlinkAll(); process.exit(143); });
}

// Resolve the credential file path. Returns:
//   { path, cleanup }  on success — `cleanup` is an async no-op for
//                                   keyFile/local paths and an
//                                   `fs.unlink` for the temp file
//                                   materialized from base64.
//   { skipped, reason } on failure — caller emits the skipped envelope.
async function resolveKeyFile() {
  const explicit = process.env.GSC_KEY_FILE;
  if (explicit) {
    try {
      await fs.access(explicit);
      return { path: explicit, cleanup: async () => {} };
    } catch {
      return { skipped: true, reason: `GSC_KEY_FILE set but not readable: ${explicit}` };
    }
  }

  const b64 = process.env.GSC_SERVICE_ACCOUNT_JSON_B64;
  if (b64) {
    let json;
    try {
      json = Buffer.from(b64, 'base64').toString('utf8');
      JSON.parse(json); // validate; throws if malformed
    } catch (err) {
      return { skipped: true, reason: `GSC_SERVICE_ACCOUNT_JSON_B64 malformed: ${err.message}` };
    }
    const tmp = path.join(tmpdir(), `gsc-ethernal-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
    await fs.writeFile(tmp, json, { mode: 0o600 });
    // Defense in depth — writeFile mode is honored on most platforms but
    // chmod explicitly anyway in case the umask interferes.
    await fs.chmod(tmp, 0o600);
    TEMP_KEY_FILES.add(tmp);
    installExitHandlersOnce();
    const cleanup = async () => {
      TEMP_KEY_FILES.delete(tmp);
      try { await fs.unlink(tmp); } catch { /* best-effort */ }
    };
    return { path: tmp, cleanup };
  }

  try {
    await fs.access(DEFAULT_KEY_FILE);
    return { path: DEFAULT_KEY_FILE, cleanup: async () => {} };
  } catch {
    return { skipped: true, reason: 'no GSC credentials (set GSC_KEY_FILE or GSC_SERVICE_ACCOUNT_JSON_B64, or place key at ~/.credentials/gsc-ethernal.json)' };
  }
}

async function buildClient(keyFile) {
  const auth = new google.auth.GoogleAuth({ keyFile, scopes: SCOPES });
  return google.searchconsole({ version: 'v1', auth });
}

// --- Signal: siteSnapshot -------------------------------------------------

async function siteSnapshot(sc, site) {
  const res = await sc.searchanalytics.query({
    siteUrl: site,
    requestBody: {
      startDate: isoDaysAgo(QUICK_WIN_DAYS),
      endDate: isoToday(),
      rowLimit: 1,
      // No dimensions → one aggregate row.
    },
  });
  const row = res.data.rows?.[0];
  return {
    clicks: row?.clicks ?? 0,
    impressions: row?.impressions ?? 0,
    ctr: row?.ctr ?? 0,
    position: row?.position ?? 0,
    rows: res.data.rows?.length ?? 0,
  };
}

// --- Signal: quickWins ----------------------------------------------------

async function quickWins(sc, site) {
  const res = await sc.searchanalytics.query({
    siteUrl: site,
    requestBody: {
      startDate: isoDaysAgo(QUICK_WIN_DAYS),
      endDate: isoToday(),
      dimensions: ['query', 'page'],
      rowLimit: 1000,
    },
  });
  const rows = res.data.rows || [];
  return rows
    .filter(
      (r) =>
        r.impressions >= QUICK_WIN_IMPRESSIONS_MIN &&
        r.position >= QUICK_WIN_POSITION_MIN &&
        r.position <= QUICK_WIN_POSITION_MAX,
    )
    .map((r) => ({
      query: r.keys[0],
      page: r.keys[1],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

// --- Signal: contentGaps --------------------------------------------------

async function contentGaps(sc, site) {
  const res = await sc.searchanalytics.query({
    siteUrl: site,
    requestBody: {
      startDate: isoDaysAgo(CONTENT_GAP_DAYS),
      endDate: isoToday(),
      dimensions: ['query'],
      rowLimit: 1000,
    },
  });
  const rows = res.data.rows || [];
  return rows
    .filter(
      (r) =>
        r.impressions >= CONTENT_GAP_IMPRESSIONS_MIN &&
        r.position > CONTENT_GAP_POSITION_MIN,
    )
    .map((r) => ({
      query: r.keys[0],
      impressions: r.impressions,
      position: r.position,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

// --- Signal: contentDecay -------------------------------------------------

async function contentDecay(sc, site) {
  const [recent, prior] = await Promise.all([
    sc.searchanalytics.query({
      siteUrl: site,
      requestBody: {
        startDate: isoDaysAgo(DECAY_DAYS),
        endDate: isoToday(),
        dimensions: ['page'],
        rowLimit: 1000,
      },
    }),
    sc.searchanalytics.query({
      siteUrl: site,
      requestBody: {
        startDate: isoDaysAgo(DECAY_DAYS * 2),
        endDate: isoDaysAgo(DECAY_DAYS + 1),
        dimensions: ['page'],
        rowLimit: 1000,
      },
    }),
  ]);

  const recentMap = new Map((recent.data.rows || []).map((r) => [r.keys[0], r.clicks]));
  const priorMap = new Map((prior.data.rows || []).map((r) => [r.keys[0], r.clicks]));

  const out = [];
  for (const [page, priorClicks] of priorMap) {
    if (priorClicks < DECAY_MIN_PRIOR_CLICKS) continue;
    const recentClicks = recentMap.get(page) || 0;
    const deltaPct = (recentClicks - priorClicks) / priorClicks;
    if (deltaPct <= DECAY_DELTA_THRESHOLD) {
      out.push({
        page,
        clicksRecent: recentClicks,
        clicksPrior: priorClicks,
        deltaPct: Number(deltaPct.toFixed(3)),
      });
    }
  }
  return out.sort((a, b) => a.deltaPct - b.deltaPct);
}

// --- Signal: ctrOpportunities ---------------------------------------------

async function ctrOpportunities(sc, site) {
  const res = await sc.searchanalytics.query({
    siteUrl: site,
    requestBody: {
      startDate: isoDaysAgo(CTR_OPPORTUNITY_DAYS),
      endDate: isoToday(),
      dimensions: ['page'],
      rowLimit: 1000,
    },
  });
  const rows = res.data.rows || [];
  return rows
    .filter((r) => r.impressions >= CTR_OPPORTUNITY_IMPRESSIONS_MIN)
    .map((r) => {
      const exp = expectedCtr(r.position);
      const gap = r.ctr / exp; // <1 means underperforming
      return {
        page: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Number(r.ctr.toFixed(4)),
        position: Number(r.position.toFixed(2)),
        expectedCtr: Number(exp.toFixed(4)),
        gap: Number(gap.toFixed(3)),
      };
    })
    .filter((x) => x.gap <= CTR_OPPORTUNITY_GAP_THRESHOLD)
    .sort((a, b) => a.gap - b.gap);
}

// --- Orchestration --------------------------------------------------------

const SIGNALS = {
  siteSnapshot,
  quickWins,
  contentGaps,
  contentDecay,
  ctrOpportunities,
};

async function runAll(sc, site, only) {
  const names = only ? [only] : Object.keys(SIGNALS);
  const out = {};
  for (const name of names) {
    try {
      out[name] = await SIGNALS[name](sc, site);
    } catch (err) {
      // One signal failing should not nuke the rest. Annotate and continue.
      log(`[gsc] signal "${name}" failed: ${err.message}`);
      out[name] = { error: err.message };
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      'Usage: node gsc.mjs [--site sc-domain:tryethernal.com] [--signal <name>]\n' +
        '\nSignals: ' +
        Object.keys(SIGNALS).join(', ') +
        '\n',
    );
    return;
  }
  if (args.signal && !SIGNALS[args.signal]) {
    log(`unknown --signal: ${args.signal} (valid: ${Object.keys(SIGNALS).join(', ')})`);
    process.exit(2);
  }

  const cred = await resolveKeyFile();
  if (cred.skipped) {
    process.stdout.write(JSON.stringify({ status: 'skipped', reason: cred.reason }, null, 2) + '\n');
    return;
  }

  let sc;
  try {
    sc = await buildClient(cred.path);
  } catch (err) {
    await cred.cleanup();
    process.stdout.write(
      JSON.stringify({ status: 'skipped', reason: `auth init failed: ${err.message}` }, null, 2) + '\n',
    );
    return;
  }

  let result;
  try {
    result = await runAll(sc, args.site, args.signal);
  } catch (err) {
    // Should not reach here — runAll catches per-signal — but defense in depth.
    process.stdout.write(
      JSON.stringify({ status: 'skipped', reason: `query failed: ${err.message}` }, null, 2) + '\n',
    );
    return;
  } finally {
    await cred.cleanup();
  }

  const envelope = {
    status: 'ok',
    site: args.site,
    generatedAt: new Date().toISOString(),
    ...result,
  };
  process.stdout.write(JSON.stringify(envelope, null, 2) + '\n');
}

// Programmatic export — pick-next.mjs (PR 1.2) imports `fetchGscSignals`
// rather than spawning the CLI. Keep this surface stable.
export async function fetchGscSignals({ site = DEFAULT_SITE, signal = null } = {}) {
  const cred = await resolveKeyFile();
  if (cred.skipped) return { status: 'skipped', reason: cred.reason };
  try {
    let sc;
    try {
      sc = await buildClient(cred.path);
    } catch (err) {
      return { status: 'skipped', reason: `auth init failed: ${err.message}` };
    }
    try {
      const result = await runAll(sc, site, signal);
      return { status: 'ok', site, generatedAt: new Date().toISOString(), ...result };
    } catch (err) {
      return { status: 'skipped', reason: `query failed: ${err.message}` };
    }
  } finally {
    await cred.cleanup();
  }
}

// Only run main() when executed as a script, not when imported.
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    // Never throw to the shell — graceful-no-op contract.
    log(`[gsc] FATAL (should not happen): ${err.stack || err.message}`);
    process.stdout.write(
      JSON.stringify({ status: 'skipped', reason: `fatal: ${err.message}` }, null, 2) + '\n',
    );
    process.exit(0);
  });
}
