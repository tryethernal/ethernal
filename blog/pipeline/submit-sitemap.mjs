#!/usr/bin/env node
/**
 * @fileoverview submit-sitemap.mjs — submit (re-ping) the Ethernal sitemaps to
 * Google Search Console via the Search Console API, then read back their status.
 *
 * Phase 5 of the search-feedback rollout (see
 * .claude/references/SERP-INTEGRATION-PLAN.md). Ported from the ronda blog
 * pipeline and adapted to ethernal:
 *
 *   - Default site is `sc-domain:tryethernal.com`.
 *   - Default sitemaps are the two tryethernal.com exposes in prod:
 *       1. https://tryethernal.com/sitemap.xml            (landing, vite-ssg)
 *       2. https://tryethernal.com/blog/sitemap-index.xml (Astro blog build)
 *   - Credential resolution mirrors gsc.mjs (the same service account already
 *     plumbed for the GSC signals): $GSC_KEY_FILE → $GSC_SERVICE_ACCOUNT_JSON_B64
 *     (base64 of the JSON, decoded to a 0600 temp file, unlinked on exit) →
 *     ~/.credentials/gsc-ethernal.json. So Phase 5 needs no new secret.
 *
 * The service account `ethernal@ethernal-493613.iam.gserviceaccount.com` must
 * be an OWNER of the GSC property — the Sitemaps.submit (PUT) endpoint is
 * Owner-only (read access is enough for the GSC signals, but not for submit).
 * If the SA only has full-user access, the PUT returns 403 and the script exits
 * non-zero; promote it to Owner in the GSC UI.
 *
 * Failure model: best-effort. The post-merge GH Action treats a non-zero exit
 * as "GSC ping flaked, Google still crawls naturally" — never block on it.
 *
 * Why no `googleapis` SDK: a JWT mint + PUT + GET is ~100 lines of plain fetch
 * with zero transitive deps. The SDK would pull ~30 MB for three requests.
 *
 * Exit codes:
 *   0 — all submissions succeeded (or status-only read succeeded)
 *   1 — one or more submissions failed (details on stderr)
 *   2 — bad CLI args / no readable credential
 *   3 — token mint failed (key revoked, clock skew, network)
 *
 * Usage:
 *   node submit-sitemap.mjs                              # default set (both)
 *   node submit-sitemap.mjs --sitemap https://tryethernal.com/sitemap.xml
 *   node submit-sitemap.mjs --site sc-domain:tryethernal.com
 *   node submit-sitemap.mjs --status-only                # GET only, no PUT
 *   node submit-sitemap.mjs --key /path/to/key.json
 */

import { readFile, access, writeFile, chmod, unlink, constants } from 'node:fs/promises';
import { unlinkSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { Buffer } from 'node:buffer';

// ---------- constants ----------

const DEFAULT_KEY_PATH = join(homedir(), '.credentials', 'gsc-ethernal.json');
const DEFAULT_SITE = 'sc-domain:tryethernal.com';
const DEFAULT_SITEMAPS = [
  'https://tryethernal.com/sitemap.xml',
  'https://tryethernal.com/blog/sitemap-index.xml',
];
// Sitemaps.submit (PUT) is Owner-only and needs the read-WRITE webmasters
// scope, not the readonly scope gsc.mjs uses for Search Analytics.
const SCOPE = 'https://www.googleapis.com/auth/webmasters';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SC_BASE = 'https://www.googleapis.com/webmasters/v3';
const REQUEST_TIMEOUT_MS = 20_000;

// ---------- CLI parsing ----------

/** Parse `--flag value` and repeatable `--sitemap <url>` args. No deps. */
function parseArgs(argv) {
  const out = { sitemaps: [], statusOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    if (key === 'status-only') {
      out.statusOnly = true;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) {
      fail(2, `Missing value for --${key}`);
    }
    if (key === 'sitemap') {
      out.sitemaps.push(value);
    } else {
      out[key] = value;
    }
    i++;
  }
  return out;
}

function fail(code, msg) {
  console.error(`submit-sitemap: ${msg}`);
  process.exit(code);
}

function log(msg) {
  console.log(`submit-sitemap: ${msg}`);
}

// Temp credential files materialized from base64. A process `exit` handler
// unlinks them synchronously — guarantees cleanup even when fail() calls
// process.exit() (which bypasses the async finally in main()). Mirrors gsc.mjs.
const TEMP_KEY_FILES = new Set();
let exitHandlerInstalled = false;
function installExitHandlerOnce() {
  if (exitHandlerInstalled) return;
  exitHandlerInstalled = true;
  const unlinkAll = () => {
    for (const p of TEMP_KEY_FILES) {
      try { unlinkSync(p); } catch { /* best-effort */ }
    }
    TEMP_KEY_FILES.clear();
  };
  process.on('exit', unlinkAll);
  process.on('SIGINT', () => { unlinkAll(); process.exit(130); });
  process.on('SIGTERM', () => { unlinkAll(); process.exit(143); });
}

// ---------- credential resolution (mirrors gsc.mjs) ----------

/**
 * Resolve the service-account JSON. Returns { json, cleanup } where cleanup is
 * an async no-op for file paths and an unlink for a temp file materialized from
 * base64. Resolution order matches gsc.mjs so Phase 5 reuses the same secret:
 *   1. --key / $GSC_KEY_FILE      (explicit path)
 *   2. $GSC_SERVICE_ACCOUNT_JSON_B64 (base64 JSON → 0600 temp file)
 *   3. ~/.credentials/gsc-ethernal.json
 * On failure, calls fail(2, ...) (never returns).
 * @param {string|undefined} explicitKey
 * @returns {Promise<{path: string, cleanup: () => Promise<void>}>}
 */
async function resolveKeyFile(explicitKey) {
  const fromFlag = explicitKey || process.env.GSC_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (fromFlag) {
    const canRead = await access(fromFlag, constants.R_OK).then(() => true, () => false);
    if (!canRead) fail(2, `Service-account key not readable at ${fromFlag}`);
    return { path: fromFlag, cleanup: async () => {} };
  }

  const b64 = process.env.GSC_SERVICE_ACCOUNT_JSON_B64;
  if (b64) {
    let json;
    try {
      json = Buffer.from(b64, 'base64').toString('utf8');
      JSON.parse(json); // validate; throws if malformed
    } catch (err) {
      fail(2, `GSC_SERVICE_ACCOUNT_JSON_B64 malformed: ${err.message}`);
    }
    const tmp = join(tmpdir(), `gsc-ethernal-sitemap-${process.pid}-${Date.now()}.json`);
    await writeFile(tmp, json, { mode: 0o600 });
    await chmod(tmp, 0o600);
    TEMP_KEY_FILES.add(tmp);
    installExitHandlerOnce();
    const cleanup = async () => {
      TEMP_KEY_FILES.delete(tmp);
      try { await unlink(tmp); } catch { /* best-effort */ }
    };
    return { path: tmp, cleanup };
  }

  const canRead = await access(DEFAULT_KEY_PATH, constants.R_OK).then(() => true, () => false);
  if (!canRead) {
    fail(2, `no credentials (set --key / GSC_KEY_FILE or GSC_SERVICE_ACCOUNT_JSON_B64, or place key at ${DEFAULT_KEY_PATH})`);
  }
  return { path: DEFAULT_KEY_PATH, cleanup: async () => {} };
}

// ---------- service-account JWT auth ----------

/** Base64url-encode a Buffer or string with no padding. */
function b64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Mint a short-lived (1h) access token from a service-account JWT.
 * Uses node:crypto directly — no `jose` / `google-auth-library` dep.
 * @param {object} sa - Parsed service-account JSON.
 * @returns {Promise<string>}
 */
async function mintAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT', kid: sa.private_key_id };
  const claims = { iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const sig = signer.sign(sa.private_key);
  const jwt = `${signingInput}.${b64url(sig)}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });

  const res = await fetchWithTimeout(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    fail(3, `token mint failed: HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = await res.json();
  return data.access_token;
}

// ---------- HTTP helper ----------

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// ---------- Search Console operations ----------

/** PUT (submit/re-submit) a sitemap. 204 No Content on success. */
async function submitSitemap(token, site, sitemapUrl) {
  const url = `${SC_BASE}/sites/${encodeURIComponent(site)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
  const res = await fetchWithTimeout(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, reason: `HTTP ${res.status}: ${text.slice(0, 400)}` };
  }
  return { ok: true };
}

/** GET the current sitemap status. Returns the parsed entry or an error. */
async function getSitemapStatus(token, site, sitemapUrl) {
  const url = `${SC_BASE}/sites/${encodeURIComponent(site)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
  const res = await fetchWithTimeout(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, reason: `HTTP ${res.status}: ${text.slice(0, 400)}` };
  }
  return { ok: true, data: await res.json() };
}

// ---------- main ----------

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const site = args.site || DEFAULT_SITE;
  const sitemaps = args.sitemaps.length > 0 ? args.sitemaps : DEFAULT_SITEMAPS;

  // Validate sitemap URLs eagerly — better than a cryptic GSC 400.
  for (const url of sitemaps) {
    if (!/^https:\/\/[^/]+\/.+/.test(url)) {
      fail(2, `Invalid sitemap URL: ${url} (must be a full https:// URL)`);
    }
  }

  const cred = await resolveKeyFile(args.key);
  let sa;
  try {
    sa = JSON.parse(await readFile(cred.path, 'utf8'));
  } catch (err) {
    await cred.cleanup();
    fail(2, `Failed to parse credential at ${cred.path}: ${err.message}`);
  }
  if (!sa?.client_email || !sa?.private_key) {
    await cred.cleanup();
    fail(2, `credential is not a valid service-account JSON (missing client_email or private_key)`);
  }

  log(`site=${site}`);
  log(`service-account=${sa.client_email}`);
  log(`sitemaps=${sitemaps.length} (${sitemaps.join(', ')})`);
  if (args.statusOnly) log('mode=status-only (no PUT)');

  let anyFailed = false;
  try {
    const token = await mintAccessToken(sa);
    log('token minted (1h validity)');

    for (const sitemap of sitemaps) {
      if (!args.statusOnly) {
        const put = await submitSitemap(token, site, sitemap);
        if (put.ok) {
          log(`PUT ${sitemap} → 204 submitted`);
        } else {
          console.error(`submit-sitemap: PUT ${sitemap} FAILED — ${put.reason}`);
          anyFailed = true;
          continue;
        }
      }

      const status = await getSitemapStatus(token, site, sitemap);
      if (!status.ok) {
        console.error(`submit-sitemap: GET ${sitemap} FAILED — ${status.reason}`);
        anyFailed = true;
        continue;
      }
      const d = status.data;
      log(
        `GET  ${sitemap} → lastSubmitted=${d.lastSubmitted || '(none)'} ` +
          `pending=${d.isPending} warnings=${d.warnings} errors=${d.errors} ` +
          `index=${d.isSitemapsIndex}`,
      );
    }
  } finally {
    await cred.cleanup();
  }

  if (anyFailed) {
    console.error('submit-sitemap: one or more sitemaps failed (see above)');
    process.exit(1);
  }
  log('done');
}

main().catch((err) => {
  console.error('submit-sitemap: unexpected error:', err);
  process.exit(1);
});
