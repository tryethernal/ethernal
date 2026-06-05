#!/usr/bin/env node
/**
 * @fileoverview enrich-keywords.mjs — enriches classify candidates with keyword
 * volume + competition data from DataForSEO. Ported and adapted from the ronda
 * blog pipeline (see .claude/references/SERP-INTEGRATION-PLAN.md). Adapted to
 * Ethernal's cluster-grouped candidate shape ({ cluster, label, score, items[],
 * contentType }) and config.js (CLUSTERS / WEIGHTS) instead of ronda's
 * per-item candidates + clusters.json.
 *
 * Invariants (carried verbatim from ronda's keyword-enrichment design):
 *   1. Editorial dominates. keywordBoost is capped at 30% of the editorial
 *      `score`. A candidate with score=0 cannot be lifted by keyword volume.
 *   2. Best-effort. Per-candidate enrichment failure NEVER causes a non-zero
 *      exit. The script writes back the candidate unchanged (+ annotation).
 *   3. Cache-first. Cached entries within TTL are reused without hitting the
 *      API. Cache lives at blog/pipeline/.cache/keywords.json (gitignored).
 *   4. Additive. Existing classify fields are never mutated. Only new fields
 *      are added: keywordsEnriched, primaryKeyword, primaryKeywordVolume,
 *      keywordBoost, finalScore, enrichedAt, enrichmentProvider,
 *      enrichmentStatus, enrichmentError (only on failure).
 *   5. Multi-word seeds ONLY. Single-word ambiguous nouns (e.g. "agent",
 *      "privacy") pull in off-intent volume; multi-word n-grams
 *      ("account abstraction", "encrypted mempool") anchor on the right intent.
 *
 * Modes:
 *   - Batch (default): JSON array of candidates from argv or stdin → enriched array.
 *       node enrich-keywords.mjs /tmp/topics.json > /tmp/topics.enriched.json
 *   - Single: --single, ONE candidate object in → ONE object out.
 *       node enrich-keywords.mjs --single /tmp/topic.json > /tmp/topic.enriched.json
 *
 * Exit codes:
 *   0 — always (best-effort). Even with all enrichments failed, exit 0.
 *   1 — only on usage error (bad args, unreadable input, invalid JSON shape).
 *
 * Env:
 *   DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD — DataForSEO Basic auth. If either is
 *   unset, every candidate is written back with enrichmentStatus: 'failed',
 *   enrichmentError: 'NO_KEY: ...', finalScore === score, and the script exits 0.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { fetchKeywordIdeas, KeywordProviderError } from './keyword-providers/dataforseo.mjs';
import { CLUSTERS, WEIGHTS } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BLACKLIST_PATH = join(__dirname, 'keyword-blacklist.json');
const CACHE_DIR = join(__dirname, '.cache');
const CACHE_PATH = join(CACHE_DIR, 'keywords.json');
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PROVIDER_NAME = 'dataforseo';

// Weight applied to the log-compressed keyword-volume sum when computing the
// boost. Lives in WEIGHTS.keyword_volume (config.js), defaults to 0.5 — same
// default as ronda's clusters.json scoreBonus.keywordVolume.
const DEFAULT_KEYWORD_WEIGHT = 0.5;

// Filter floors / ceilings. tryethernal.com is a higher-authority dev-tooling
// domain than ronda's 0-DR consumer site, but the niche-B2B band still
// dominates. Start with ronda's calibrated values; revisit the ceiling after
// the first real run shows what volume we can actually rank for.
const VOLUME_FLOOR = 50;
const VOLUME_CEILING = 10_000;
const HIGH_VOLUME_THRESHOLD = 2_000;
const MAX_KEYWORDS_PER_CANDIDATE = 15;
const TOP_N_FOR_BOOST = 5;
// Distinctive single tokens must be >=7 chars to count as topical overlap —
// catches genuine terms ("rollup" 6 is borderline; "abstraction" 11,
// "sequencer" 9, "validator" 9) while filtering 4-6 char ambient noise.
const DISTINCTIVE_TOKEN_MIN_LEN = 7;

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'has',
  'have', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'the', 'to', 'with',
  'this', 'that', 'these', 'those', 'how', 'why', 'what', 'when', 'where',
  'your', 'you', 'we', 'our', 'i', 'me', 'my',
]);

// Domain-anchor tokens. A multi-word seed like "smart account" or "data
// availability" is ambiguous outside crypto (it pulls "cisco smart account",
// "data availability statement sample"). The PRIMARY keyword — the one that
// drives the post title/slug — must contain at least one of these crypto/EVM
// anchor tokens (or a cluster keyword as a contiguous phrase) so we never
// title a post around an off-intent collision. Non-primary keywords use the
// looser topical-overlap test (they're optional body vocabulary, not the H1).
const DOMAIN_ANCHOR_TOKENS = new Set([
  'ethereum', 'evm', 'eip', 'erc', 'solidity', 'blockchain', 'onchain',
  'crypto', 'web3', 'defi', 'rollup', 'l2', 'zk', 'zkevm', 'mev', 'nft',
  'dao', 'gas', 'gwei', 'wei', 'mainnet', 'testnet', 'smart', 'contract',
  'contracts', 'token', 'tokens', 'wallet', 'staking', 'validator',
  'sequencer', 'mempool', 'opcode', 'bytecode', 'abi', 'rpc', 'dapp',
  'arbitrum', 'optimism', 'polygon', 'base', 'blast', 'avalanche',
]);

function hasDomainAnchor(phrase, clusterKeywords) {
  const lower = phrase.toLowerCase();
  // Cluster keyword as a contiguous substring is the strongest anchor.
  for (const kw of clusterKeywords) {
    if (kw.includes(' ') && lower.includes(kw.toLowerCase())) return true;
  }
  // Otherwise require a crypto/EVM domain token.
  for (const t of lower.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)) {
    if (DOMAIN_ANCHOR_TOKENS.has(t)) return true;
  }
  return false;
}

function log(...args) {
  process.stderr.write(args.map(String).join(' ') + '\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Cache (atomic write, 30-day TTL)
// ────────────────────────────────────────────────────────────────────────────

async function loadCache() {
  if (!existsSync(CACHE_PATH)) return { version: 1, entries: {} };
  try {
    const parsed = JSON.parse(await readFile(CACHE_PATH, 'utf8'));
    if (parsed?.version !== 1 || typeof parsed.entries !== 'object') {
      log('[enrich] cache file has unexpected shape; starting cold');
      return { version: 1, entries: {} };
    }
    return parsed;
  } catch (err) {
    log(`[enrich] cache read failed (${err.message}); starting cold`);
    return { version: 1, entries: {} };
  }
}

async function saveCache(cache) {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const tmp = `${CACHE_PATH}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(cache, null, 2));
    const { rename } = await import('node:fs/promises');
    await rename(tmp, CACHE_PATH);
  } catch (err) {
    log(`[enrich] cache write failed (non-fatal): ${err.message}`);
  }
}

function cacheGet(cache, key) {
  const e = cache.entries[key.toLowerCase()];
  if (!e) return null;
  const age = Date.now() - new Date(e.fetchedAt).getTime();
  if (Number.isNaN(age) || age > CACHE_TTL_MS) return null;
  return e;
}

function cacheSet(cache, key, entry) {
  cache.entries[key.toLowerCase()] = entry;
}

// ────────────────────────────────────────────────────────────────────────────
// Candidate adaptation — Ethernal's classify output shape
// ────────────────────────────────────────────────────────────────────────────

// A candidate id for logging. Ethernal candidates are cluster-grouped, so the
// cluster key is the natural id; fall back to label.
function candidateId(candidate) {
  return candidate.id || candidate.cluster || candidate.label || 'unknown';
}

// The text used to detect which cluster keywords are topically present:
// the cluster label + the titles of the grouped source items.
function candidateHaystack(candidate) {
  const parts = [candidate.label || '', candidate.title || '', candidate.summary || ''];
  if (Array.isArray(candidate.items)) {
    for (const it of candidate.items) {
      if (it && typeof it.title === 'string') parts.push(it.title);
    }
  }
  return parts.join(' ').toLowerCase();
}

function clusterKeywordsFor(candidate) {
  const cluster = CLUSTERS[candidate.cluster];
  return Array.isArray(cluster?.keywords) ? cluster.keywords : [];
}

// ────────────────────────────────────────────────────────────────────────────
// Seed extraction (multi-word ONLY)
// ────────────────────────────────────────────────────────────────────────────

function extractSeeds(candidate) {
  const seeds = new Set();
  const hay = candidateHaystack(candidate);
  const keywords = clusterKeywordsFor(candidate);

  // 1. Multi-word cluster keywords that actually appear in the candidate text.
  const multiWordMatched = keywords.filter(
    (kw) => (kw.includes(' ') || kw.includes('-')) && hay.includes(kw.toLowerCase()),
  );
  for (const m of multiWordMatched.slice(0, 5)) seeds.add(m);

  // 2. Defensive fallback: if nothing matched, use the cluster's top 2
  //    multi-word keywords unconditionally (better than sending nothing).
  if (seeds.size === 0) {
    const multiWord = keywords.filter((kw) => kw.includes(' ') || kw.includes('-'));
    for (const m of multiWord.slice(0, 2)) seeds.add(m);
  }

  return Array.from(seeds).slice(0, 10);
}

// ────────────────────────────────────────────────────────────────────────────
// Filtering
// ────────────────────────────────────────────────────────────────────────────

function tokenize(s) {
  return new Set(
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t && !STOP_WORDS.has(t)),
  );
}

function hasStrictPhraseOverlap(phrase, clusterKeywords) {
  const lower = phrase.toLowerCase();
  for (const kw of clusterKeywords) {
    if (lower.includes(kw.toLowerCase())) return true;
  }
  return false;
}

function hasTopicalOverlap(phrase, { clusterKeywords, distinctiveTokens }) {
  if (hasStrictPhraseOverlap(phrase, clusterKeywords)) return true;
  const phraseTokens = tokenize(phrase);
  for (const t of phraseTokens) {
    if (t.length >= DISTINCTIVE_TOKEN_MIN_LEN && distinctiveTokens.has(t)) return true;
  }
  return false;
}

function matchesBlacklist(phrase, blacklist) {
  const lower = phrase.toLowerCase();
  for (const bucket of ['competitors', 'junkPatterns', 'metaPatterns']) {
    for (const item of blacklist[bucket] || []) {
      if (lower.includes(item.toLowerCase())) return bucket;
    }
  }
  return null;
}

function filterIdeas(ideas, candidate, blacklist) {
  const drops = { volumeFloor: 0, volumeCeiling: 0, blacklist: 0, noOverlap: 0, noStrictOverlap: 0, competitionHigh: 0 };

  const clusterKeywords = clusterKeywordsFor(candidate);
  // Distinctive tokens come ONLY from single-word cluster keywords (tokenizing
  // multi-word keywords yields generic words like "transaction" that cause
  // false positives). Plus distinctive tokens from the label.
  const distinctiveTokens = new Set();
  for (const kw of clusterKeywords) {
    if (!kw.includes(' ') && !kw.includes('-')) {
      for (const t of tokenize(kw)) if (t.length >= DISTINCTIVE_TOKEN_MIN_LEN) distinctiveTokens.add(t);
    }
  }
  for (const t of tokenize(candidate.label)) {
    if (t.length >= DISTINCTIVE_TOKEN_MIN_LEN) distinctiveTokens.add(t);
  }
  const overlapCtx = { clusterKeywords, distinctiveTokens };

  const kept = [];
  let hasNonHigh = false;
  for (const idea of ideas) {
    if (idea.volume < VOLUME_FLOOR) { drops.volumeFloor++; continue; }
    if (idea.volume > VOLUME_CEILING) { drops.volumeCeiling++; continue; }
    if (matchesBlacklist(idea.phrase, blacklist)) { drops.blacklist++; continue; }
    if (idea.volume >= HIGH_VOLUME_THRESHOLD) {
      if (!hasStrictPhraseOverlap(idea.phrase, clusterKeywords)) { drops.noStrictOverlap++; continue; }
    } else {
      if (!hasTopicalOverlap(idea.phrase, overlapCtx)) { drops.noOverlap++; continue; }
    }
    if (idea.competition !== 'HIGH') hasNonHigh = true;
    kept.push(idea);
  }

  // Competition gate: drop HIGH only if at least one non-HIGH survived.
  const finalKept = kept.filter((idea) => {
    if (idea.competition === 'HIGH' && hasNonHigh) { drops.competitionHigh++; return false; }
    return true;
  });

  finalKept.sort((a, b) => b.volume - a.volume);
  const trimmed = finalKept.slice(0, MAX_KEYWORDS_PER_CANDIDATE);

  log(
    `[enrich] candidate "${candidateId(candidate)}": ${ideas.length} → ${trimmed.length} after filters ` +
      `(floor:${drops.volumeFloor} ceil:${drops.volumeCeiling} bl:${drops.blacklist} ` +
      `no-overlap:${drops.noOverlap} no-strict:${drops.noStrictOverlap} high-comp:${drops.competitionHigh})`,
  );

  return trimmed;
}

// ────────────────────────────────────────────────────────────────────────────
// Scoring
// ────────────────────────────────────────────────────────────────────────────

function computeBoost(keywordsEnriched, baseScore, weight) {
  if (!keywordsEnriched || keywordsEnriched.length === 0) return 0;
  const top = keywordsEnriched.slice(0, TOP_N_FOR_BOOST);
  const sum = top.reduce((acc, k) => acc + (Number(k.volume) || 0), 0);
  if (sum <= 0) return 0;
  const raw = Math.log10(sum + 1) * weight;
  const cap = 0.3 * baseScore; // bright line: editorial >= 70% of finalScore
  return Math.min(raw, cap);
}

// ────────────────────────────────────────────────────────────────────────────
// Provider call with cache
// ────────────────────────────────────────────────────────────────────────────

async function fetchIdeasForCandidate(candidate, cache) {
  const seeds = extractSeeds(candidate);
  if (seeds.length === 0) {
    return { status: 'failed', error: 'no usable multi-word seeds', ideas: [] };
  }

  const seedKey = `seeds:${seeds.map((s) => s.toLowerCase()).sort().join('|')}`;
  const cached = cacheGet(cache, seedKey);
  if (cached?.ideas) {
    log(`[enrich] candidate "${candidateId(candidate)}": cache hit on seed bundle`);
    return { status: 'ok', ideas: cached.ideas, fromCache: true };
  }

  let ideas;
  try {
    ideas = await fetchKeywordIdeas({ seeds, geo: 'US', lang: 'en', limit: 100 });
  } catch (err) {
    if (err instanceof KeywordProviderError) {
      log(`[enrich] candidate "${candidateId(candidate)}": provider error ${err.code}: ${err.message}`);
      return { status: 'failed', error: `${err.code}: ${err.message}`, ideas: [] };
    }
    log(`[enrich] candidate "${candidateId(candidate)}": unexpected error: ${err.message}`);
    return { status: 'failed', error: `UNKNOWN: ${err.message}`, ideas: [] };
  }

  const fetchedAt = new Date().toISOString();
  cacheSet(cache, seedKey, { ideas, fetchedAt, provider: PROVIDER_NAME });
  for (const idea of ideas) {
    cacheSet(cache, idea.phrase, {
      volume: idea.volume,
      competition: idea.competition,
      fetchedAt,
      provider: PROVIDER_NAME,
    });
  }
  return { status: 'ok', ideas, fromCache: false };
}

// ────────────────────────────────────────────────────────────────────────────
// Per-candidate enrichment
// ────────────────────────────────────────────────────────────────────────────

async function enrichCandidate(candidate, weight, blacklist, cache) {
  const baseScore = Number(candidate.score) || 0;
  const enrichedAt = new Date().toISOString();
  const empty = {
    keywordsEnriched: [],
    primaryKeyword: null,
    primaryKeywordVolume: null,
    keywordBoost: 0,
    finalScore: baseScore,
    enrichedAt,
    enrichmentProvider: PROVIDER_NAME,
  };

  if (baseScore <= 0) {
    return { ...candidate, ...empty, enrichmentStatus: 'skipped', enrichmentError: 'score is 0' };
  }

  const result = await fetchIdeasForCandidate(candidate, cache);
  if (result.status !== 'ok') {
    return { ...candidate, ...empty, enrichmentStatus: 'failed', enrichmentError: result.error };
  }

  const filtered = filterIdeas(result.ideas, candidate, blacklist);
  if (filtered.length === 0) {
    return { ...candidate, ...empty, enrichmentStatus: 'ok' };
  }

  // Primary keyword (drives title/slug) MUST carry a crypto/EVM domain anchor,
  // so we never headline a post around an off-intent collision (e.g.
  // "cisco smart account"). Pick the highest-volume anchored phrase as primary;
  // if none is anchored, leave primaryKeyword null but still surface the
  // filtered phrases as optional body vocabulary.
  const clusterKeywords = clusterKeywordsFor(candidate);
  const primary = filtered.find((k) => hasDomainAnchor(k.phrase, clusterKeywords)) || null;
  if (!primary) {
    log(`[enrich] candidate "${candidateId(candidate)}": no domain-anchored primary; keeping ${filtered.length} phrases as non-primary vocabulary`);
  }
  const boost = computeBoost(filtered, baseScore, weight);
  return {
    ...candidate,
    keywordsEnriched: filtered,
    primaryKeyword: primary ? primary.phrase : null,
    primaryKeywordVolume: primary ? primary.volume : null,
    keywordBoost: Number(boost.toFixed(3)),
    finalScore: Number((baseScore + boost).toFixed(3)),
    enrichedAt,
    enrichmentProvider: PROVIDER_NAME,
    enrichmentStatus: 'ok',
  };
}

// ────────────────────────────────────────────────────────────────────────────
// I/O
// ────────────────────────────────────────────────────────────────────────────

async function readJsonInput(pathArg) {
  if (pathArg && pathArg !== '-') {
    return JSON.parse(await readFile(pathArg, 'utf8'));
  }
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    process.stdin.on('error', reject);
  });
}

function parseArgs(argv) {
  const args = { single: false, path: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--single') args.single = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (!args.path) args.path = a;
  }
  return args;
}

function usage() {
  process.stderr.write(
    [
      'Usage: enrich-keywords.mjs [--single] <path-or-->',
      '',
      'Batch (default):  node enrich-keywords.mjs /tmp/topics.json > /tmp/topics.enriched.json',
      'Single:           node enrich-keywords.mjs --single /tmp/topic.json > /tmp/topic.enriched.json',
      '',
      'Exit 0 always on best-effort completion (per-candidate failures annotated inline).',
      'Exit 1 only on usage / I/O error.',
      '',
      'Env: DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD. If unset, all candidates are',
      '     written back with enrichmentStatus: "failed" and the script exits 0.',
      '',
    ].join('\n'),
  );
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) { usage(); process.exit(0); }

  const weight = Number(WEIGHTS?.keyword_volume) || DEFAULT_KEYWORD_WEIGHT;

  let blacklist = { competitors: [], junkPatterns: [], metaPatterns: [] };
  try {
    blacklist = JSON.parse(await readFile(BLACKLIST_PATH, 'utf8'));
  } catch (err) {
    log(`[enrich] keyword-blacklist.json missing or invalid (${err.message}); proceeding with empty blacklist`);
  }

  let input;
  try {
    input = await readJsonInput(args.path);
  } catch (err) {
    log(`[enrich] failed to read input: ${err.message}`);
    process.exit(1);
  }

  const cache = await loadCache();
  let output;
  const stats = { total: 0, ok: 0, failed: 0, skipped: 0, withKeywords: 0 };
  const tally = (e) => {
    if (e.enrichmentStatus === 'ok') stats.ok++;
    else if (e.enrichmentStatus === 'skipped') stats.skipped++;
    else stats.failed++;
    if (e.keywordsEnriched?.length > 0) stats.withKeywords++;
  };

  if (args.single) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      log('[enrich] --single requires a single JSON object on input');
      process.exit(1);
    }
    stats.total = 1;
    const enriched = await enrichCandidate(input, weight, blacklist, cache);
    tally(enriched);
    output = enriched;
  } else {
    if (!Array.isArray(input)) {
      log('[enrich] batch mode requires a JSON array of candidates');
      process.exit(1);
    }
    stats.total = input.length;
    const enriched = [];
    for (const candidate of input) {
      const e = await enrichCandidate(candidate, weight, blacklist, cache);
      tally(e);
      enriched.push(e);
    }
    enriched.sort((a, b) => (b.finalScore ?? b.score ?? 0) - (a.finalScore ?? a.score ?? 0));
    output = enriched;
  }

  await saveCache(cache);

  log(
    `[enrich] done: ${stats.total} total, ${stats.ok} ok, ${stats.skipped} skipped, ` +
      `${stats.failed} failed, ${stats.withKeywords} with >=1 keyword`,
  );
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Programmatic API — index.js imports this to enrich in-process during the
// weekly run, rather than shelling out. Best-effort: a thrown provider/network
// error inside enrichCandidate is already caught per-candidate; this wrapper
// additionally guards against load/parse failures so the caller never crashes.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Enrich an array of classify candidates in-process. Never throws — on any
 * setup failure it returns the input candidates annotated as enrichment-failed
 * (finalScore === score), preserving the best-effort contract.
 * @param {Array<object>} candidates
 * @returns {Promise<Array<object>>}
 */
export async function enrichCandidates(candidates) {
  if (!Array.isArray(candidates)) return [];
  let blacklist = { competitors: [], junkPatterns: [], metaPatterns: [] };
  try {
    blacklist = JSON.parse(await readFile(BLACKLIST_PATH, 'utf8'));
  } catch (err) {
    log(`[enrich] blacklist load failed (${err.message}); empty blacklist`);
  }
  const weight = Number(WEIGHTS?.keyword_volume) || DEFAULT_KEYWORD_WEIGHT;
  const cache = await loadCache();
  const out = [];
  for (const candidate of candidates) {
    try {
      out.push(await enrichCandidate(candidate, weight, blacklist, cache));
    } catch (err) {
      log(`[enrich] candidate enrich threw (${err.message}); passing through unenriched`);
      const score = Number(candidate.score) || 0;
      out.push({
        ...candidate,
        keywordsEnriched: [],
        primaryKeyword: null,
        primaryKeywordVolume: null,
        keywordBoost: 0,
        finalScore: score,
        enrichmentProvider: PROVIDER_NAME,
        enrichmentStatus: 'failed',
        enrichmentError: `UNCAUGHT: ${err.message}`,
      });
    }
  }
  await saveCache(cache);
  return out;
}

// Only run the CLI when executed directly, not when imported by index.js.
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    log(`[enrich] FATAL: ${err.stack || err.message}`);
    process.exit(1);
  });
}
