#!/usr/bin/env node
// serp-terms.mjs — SERP-grounded term/entity extraction for the blog drafter.
//
// Given a primaryKeyword, fetches the top organic SERP results via DataForSEO
// and extracts the terms and named entities that competitors cover. The output
// is a set of soft coverage hints for the draft phase — NOT keyword-density
// quotas. See the bright-line note below.
//
// Bright line: this module runs AFTER topic selection (pick-next.mjs) and
// feeds ONLY the draft phase. It MUST NOT influence classify.mjs scoring,
// finalScore, or candidate creation. It does not touch enrich-keywords.mjs
// logic.
//
// Output (stdout, JSON):
//
//   {
//     "status":   "ok",
//     "keyword":  "<primaryKeyword>",
//     "terms":    [{ "term": "feature rollout", "freq": 4 }, ...],
//     "entities": ["LaunchDarkly", "Split.io", ...],
//     "relatedSearches": ["feature flag management", ...],
//     "peopleAlsoAsk":   ["What are feature flags?", ...],
//     "cachedAt": "<ISO timestamp>"
//   }
//
// On missing creds, quota, or network failure:
//
//   { "status": "skipped", "reason": "<why>" }
//
// and exit 0.
//
// CLI:
//   node serp-terms.mjs --keyword "feature flags for product teams"
//   node serp-terms.mjs --keyword "feature flags" --geo US --depth 10
//   node serp-terms.mjs --keyword "feature flags" --bodies  # opt-in page-body extraction
//
// Exit codes:
//   0 — always (best-effort, same contract as gsc.mjs and enrich-keywords.mjs)
//   1 — caller error (bad args only)
//
// Auth: same DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD env vars used by
//   enrich-keywords.mjs. Both unset → { status: 'skipped' }, exit 0.
//
// Cache: blog/pipeline/.cache/serp-terms.json (gitignored)
//   TTL: 7 days (shorter than keywords cache at 30d — SERP changes faster)
//   Key: sha256-like hash of "keyword:geo:lang" lowercased
//   Note: --bodies runs intentionally share the same key as snippet-only runs.
//   A --bodies run with a cached keyword returns from cache (snippet-only).
//   To force a body-augmented run, clear .cache/serp-terms.json first.
//
// Cost note: DataForSEO serp/google/organic/live/advanced costs ~$0.002-0.006
//   per call, depending on depth. At depth=10 this is trivially cheap.
//   One call per new-post draft cycle. Cache means the same keyword
//   within 7d is free.
//
// --bodies / SERP_FETCH_BODIES=1: fetches each organic result's page body and
//   extracts terms from readable text. Adds ~2-5s of wall-clock per draft run.
//   Any individual fetch failure drops that result and continues. The snippet
//   path is always included; bodies augment it.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

import { fetchSerpOrganic, KeywordProviderError } from './keyword-providers/dataforseo.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CACHE_DIR = join(__dirname, '.cache');
const CACHE_PATH = join(CACHE_DIR, 'serp-terms.json');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─────────────────────────────────────────────────────────────────────────────
// Stop-word set for term extraction (English)
// Extended subset tuned for content/SEO vocabulary. Single characters and
// purely functional words that don't carry topical signal.
// ─────────────────────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'but',
  'by', 'can', 'do', 'does', 'each', 'for', 'from', 'get', 'got',
  'had', 'has', 'have', 'he', 'her', 'him', 'his', 'how', 'i', 'if',
  'in', 'into', 'is', 'it', 'its', 'just', 'me', 'my', 'new', 'no',
  'not', 'now', 'of', 'on', 'one', 'or', 'our', 'out', 's', 'she',
  'so', 'some', 'than', 'that', 'the', 'their', 'them', 'then', 'there',
  'these', 'they', 'this', 'those', 'through', 'to', 'up', 'use', 'used',
  'using', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while',
  'who', 'why', 'will', 'with', 'you', 'your', 'about', 'also', 'all',
  'any', 'back', 'both', 'down', 'even', 'first', 'give', 'go', 'good',
  'great', 'here', 'high', 'help', 'know', 'last', 'let', 'like', 'long',
  'look', 'made', 'make', 'many', 'may', 'more', 'most', 'much', 'need',
  'next', 'only', 'other', 'over', 'own', 'part', 'place', 'right',
  'same', 'say', 'see', 'set', 'should', 'show', 'since', 'such',
  'take', 'time', 'top', 'two', 'want', 'way', 'well', 'work', 'year',
  'read', 'free', 'find', 'best', 'better', 'said', 'every',
  'must', 'still', 'try', 'keep', 'able', 'start', 'end', 'means',
  'across', 'within', 'without', 'against', 'between', 'after', 'before',
  'during', 'around', 'along', 'whether',
  // Additional near-stopwords observed as noise in SERP snippets
  // Note: 'week' intentionally excluded — it forms genuine signal as part of
  // bigrams like 'week cycles'.
  'really', 'heard', 'different', 'actually', 'always', 'never',
  'often', 'usually', 'maybe', 'rather', 'quite', 'very', 'little',
  'thing', 'things', 'point', 'people', 'person', 'team', 'teams',
  'company', 'business', 'product', 'process', 'approach',
]);

// Minimum character length for a term to be kept (single letters add noise)
const MIN_TERM_LEN = 4;
// Maximum number of terms to emit (top by frequency)
const MAX_TERMS = 20;
// Maximum number of entities (named-looking phrases) to emit
const MAX_ENTITIES = 10;

function log(...args) {
  process.stderr.write(args.map(String).join(' ') + '\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────────────────────────────

function cacheKey(keyword, geo, lang) {
  return createHash('sha256')
    .update(`${keyword.toLowerCase()}:${geo}:${lang}`)
    .digest('hex')
    .slice(0, 16);
}

async function loadCache() {
  if (!existsSync(CACHE_PATH)) return { version: 1, entries: {} };
  try {
    const raw = await readFile(CACHE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || typeof parsed.entries !== 'object') {
      return { version: 1, entries: {} };
    }
    return parsed;
  } catch {
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
    log(`[serp-terms] cache write failed (non-fatal): ${err.message}`);
  }
}

function cacheGet(cache, key) {
  const e = cache.entries[key];
  if (!e) return null;
  const age = Date.now() - new Date(e.cachedAt).getTime();
  if (Number.isNaN(age) || age > CACHE_TTL_MS) return null;
  return e;
}

function cacheSet(cache, key, entry) {
  cache.entries[key] = entry;
}

// ─────────────────────────────────────────────────────────────────────────────
// Term / entity extraction
// ─────────────────────────────────────────────────────────────────────────────

// Tokenize text into lowercase words with at least MIN_TERM_LEN chars.
function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= MIN_TERM_LEN && !STOP_WORDS.has(t));
}

// Extract bigrams (two-word phrases) from a token array.
function bigrams(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const pair = `${tokens[i]} ${tokens[i + 1]}`;
    out.push(pair);
  }
  return out;
}

// A named entity candidate is a sequence of capitalized words in the ORIGINAL
// (non-lowercased) text. E.g. "LaunchDarkly", "Google Analytics", "Stripe API".
// We look for 1-3 consecutive Title-Case or ALL-CAPS tokens, excluding the
// first word of a sentence (which is always capitalized).
function extractEntityCandidates(text) {
  // Split into sentences first so we can skip sentence-initial capitals.
  const sentences = String(text || '').split(/(?<=[.!?])\s+/);
  const candidates = new Map(); // normalized → display form

  const ENTITY_RE = /\b([A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*){0,2})\b/g;
  for (const sentence of sentences) {
    // Trim the first word from the entity regex search area to avoid picking
    // up sentence-opening capitals.
    const trimmed = sentence.replace(/^\S+\s*/, '');
    let m;
    while ((m = ENTITY_RE.exec(trimmed)) !== null) {
      const entity = m[1].trim();
      // Reject very short things (acronyms are fine if ≥2 chars, but single
      // letters are noise) and fully numeric strings.
      if (entity.length < 2) continue;
      if (/^\d+$/.test(entity)) continue;
      // Reject if any word is a stop word in lowercase form
      const words = entity.split(/\s+/);
      if (words.some((w) => STOP_WORDS.has(w.toLowerCase()))) continue;
      const key = entity.toLowerCase();
      // Keep the version with the most uppercase as the display form
      if (!candidates.has(key) || candidates.get(key).length < entity.length) {
        candidates.set(key, entity);
      }
    }
  }
  return Array.from(candidates.values());
}

// Build a set of individual query tokens (lowercased) for query-echo filtering.
function queryTokens(keyword) {
  return new Set(
    String(keyword || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= MIN_TERM_LEN)
  );
}

// Returns true if a term is just the query itself or a subset of query tokens.
// This removes "shape" / "scrum" class of noise when the keyword is "shape up vs scrum".
function isQueryEcho(term, qTokens) {
  // A unigram that is itself one of the query tokens is noise.
  if (!term.includes(' ')) return qTokens.has(term);
  // A bigram is noise if both words are query tokens.
  const parts = term.split(' ');
  return parts.every((p) => qTokens.has(p));
}

// Merge a per-result frequency map into the global accumulator.
function mergeFreq(acc, perResult, weight) {
  for (const [t, f] of perResult) {
    acc.set(t, (acc.get(t) || 0) + f * weight);
  }
}

// Extract a frequency map from a single block of text (already one result's worth).
// Returns a Map<term, rawFreq> where terms span no more than one source text.
function extractFreqFromText(text, includesBigrams) {
  const tokens = tokenize(text);
  const freq = new Map();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) || 0) + 1);
  }
  if (includesBigrams) {
    for (const pair of bigrams(tokens)) {
      freq.set(pair, (freq.get(pair) || 0) + 1);
    }
  }
  return freq;
}

// Main extraction: takes the list of organic results and returns terms + entities.
// Each result is tokenized independently so bigrams never span two titles.
// keyword is passed to filter query-echo terms (e.g. drop "shape" when keyword
// is "shape up vs scrum").
function extractTermsAndEntities(organicResults, keyword) {
  const qTokens = queryTokens(keyword);
  const freq = new Map();
  const fullTextParts = [];

  for (const r of organicResults) {
    const title = String(r.title || '');
    const snippet = String(r.snippet || '');

    // Title terms are weighted 3× — titles are SERP's highest-signal text.
    // Bigrams are computed within this result's title only (never crossing to
    // the next result's title).
    mergeFreq(freq, extractFreqFromText(title, true), 3);
    mergeFreq(freq, extractFreqFromText(snippet, true), 1);

    fullTextParts.push(title, snippet);
  }

  const fullText = fullTextParts.join(' ');

  // Sort by frequency desc, cap at MAX_TERMS. Drop query-echo and short terms.
  const terms = Array.from(freq.entries())
    .filter(([t]) => t.length >= MIN_TERM_LEN && !isQueryEcho(t, qTokens))
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TERMS)
    .map(([term, f]) => ({ term, freq: f }));

  // Named entities from the combined corpus.
  const entities = extractEntityCandidates(fullText)
    .slice(0, MAX_ENTITIES);

  return { terms, entities };
}

// ─────────────────────────────────────────────────────────────────────────────
// Page-body extraction (opt-in via --bodies / SERP_FETCH_BODIES=1)
// ─────────────────────────────────────────────────────────────────────────────

const BODY_FETCH_TIMEOUT_MS = 8_000;
const BODY_MAX_CONCURRENCY = 3;
const BODY_MAX_RESULTS = 5;
// Scale-factor for body-text term frequency contributions. Without scaling, 50k chars
// of body text per page produces tens of thousands of raw token counts, dwarfing
// snippet signal (~45 weighted tokens/result from title×3 + snippet×1). At 0.1, a
// term repeated 80× in a body contributes 8 to the merged map — competitive with
// snippet signal (2–6 for a genuine term) without drowning it.
const BODY_TEXT_WEIGHT = 0.1;
// User-agent matching collect.mjs
const PIPELINE_UA = 'ethernal-blog-pipeline/0.1 (+https://tryethernal.com/blog; contact: antoine@tryethernal.com)';

// Strip HTML tags and collapse whitespace to get readable text.
// No external dependency — handles the common case well enough for term extraction.
function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Fetch readable text from a page URL. Returns null on any failure.
async function fetchPageText(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BODY_FETCH_TIMEOUT_MS);
    let html;
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': PIPELINE_UA },
      });
      if (!res.ok) return null;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('html')) return null;
      html = await res.text();
    } finally {
      clearTimeout(timer);
    }
    return stripHtml(html).slice(0, 50_000); // cap at ~50k chars of readable text
  } catch {
    return null;
  }
}

// Fetch top-N page bodies concurrently (capped at BODY_MAX_CONCURRENCY).
// Returns an array of { url, text } for successful fetches only.
async function fetchPageBodies(organicResults) {
  const targets = organicResults.slice(0, BODY_MAX_RESULTS);
  const results = [];
  // Process in batches of BODY_MAX_CONCURRENCY
  for (let i = 0; i < targets.length; i += BODY_MAX_CONCURRENCY) {
    const batch = targets.slice(i, i + BODY_MAX_CONCURRENCY);
    const fetched = await Promise.all(
      batch.map(async (r) => {
        const text = await fetchPageText(r.url);
        if (text) log(`[serp-terms] body fetched: ${r.url.slice(0, 60)}`);
        else log(`[serp-terms] body skip (fail/non-html): ${r.url.slice(0, 60)}`);
        return text ? { url: r.url, text } : null;
      })
    );
    results.push(...fetched.filter(Boolean));
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main fetch-and-extract function
// ─────────────────────────────────────────────────────────────────────────────

async function fetchSerpTerms(keyword, geo, lang, depth, fetchBodies) {
  const cache = await loadCache();
  const key = cacheKey(keyword, geo, lang);
  const cached = cacheGet(cache, key);
  if (cached) {
    log(`[serp-terms] cache hit for "${keyword}"`);
    return { fromCache: true, result: cached, cache };
  }

  let serpData;
  try {
    serpData = await fetchSerpOrganic({ keyword, geo, lang, depth });
  } catch (err) {
    if (err instanceof KeywordProviderError) {
      const skippedResult = { status: 'skipped', reason: `${err.code}: ${err.message}` };
      return { fromCache: false, result: skippedResult, cache };
    }
    const skippedResult = { status: 'skipped', reason: `unexpected: ${err.message}` };
    return { fromCache: false, result: skippedResult, cache };
  }

  const { organicResults, relatedSearches, peopleAlsoAsk } = serpData;

  // Snippet-based extraction (always runs).
  const { terms: snippetTerms, entities: snippetEntities } = extractTermsAndEntities(organicResults, keyword);

  let terms = snippetTerms;
  let entities = snippetEntities;
  let bodiesNote = null;

  // Page-body extraction (opt-in via --bodies / SERP_FETCH_BODIES=1).
  if (fetchBodies) {
    log(`[serp-terms] --bodies: fetching up to ${BODY_MAX_RESULTS} page bodies`);
    const bodies = await fetchPageBodies(organicResults);
    bodiesNote = `${bodies.length}/${Math.min(organicResults.length, BODY_MAX_RESULTS)} bodies fetched`;

    if (bodies.length > 0) {
      // Build a supplemental freq map from body text.
      // BODY_TEXT_WEIGHT prevents raw body counts from dwarfing snippet signal.
      const qTokens = queryTokens(keyword);
      const bodyFreq = new Map();
      for (const { text } of bodies) {
        mergeFreq(bodyFreq, extractFreqFromText(text, true), BODY_TEXT_WEIGHT);
      }
      // Merge body freq into snippet freq (snippet terms are already scored
      // with title weighting; body scores add signal for entities/terms the
      // snippets missed).
      const combined = new Map(snippetTerms.map((t) => [t.term, t.freq]));
      for (const [t, f] of bodyFreq) {
        if (t.length >= MIN_TERM_LEN && !isQueryEcho(t, qTokens)) {
          combined.set(t, (combined.get(t) || 0) + f);
        }
      }
      terms = Array.from(combined.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_TERMS)
        .map(([term, freq]) => ({ term, freq }));

      // Extract named entities from body text and merge with snippet entities.
      // De-dupe by lowercased key, keeping the longest display form, capped at MAX_ENTITIES.
      const bodyEntityText = bodies.map((b) => b.text).join('\n\n');
      const bodyEntityCandidates = extractEntityCandidates(bodyEntityText);
      const entityMap = new Map(entities.map((e) => [e.toLowerCase(), e]));
      for (const e of bodyEntityCandidates) {
        const key = e.toLowerCase();
        if (!entityMap.has(key) || entityMap.get(key).length < e.length) {
          entityMap.set(key, e);
        }
      }
      entities = Array.from(entityMap.values()).slice(0, MAX_ENTITIES);
    }
    log(`[serp-terms] bodies: ${bodiesNote}`);
  }

  const cachedAt = new Date().toISOString();
  const result = {
    status: 'ok',
    keyword,
    terms,
    entities,
    relatedSearches: relatedSearches.slice(0, 10),
    peopleAlsoAsk: peopleAlsoAsk.slice(0, 8),
    cachedAt,
    ...(bodiesNote != null ? { bodiesNote } : {}),
  };

  cacheSet(cache, key, result);
  await saveCache(cache);

  log(`[serp-terms] fetched ${organicResults.length} results for "${keyword}": ` +
      `${terms.length} terms, ${entities.length} entities`);
  return { fromCache: false, result, cache };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { keyword: null, geo: 'US', lang: 'en', depth: 10, bodies: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { out.help = true; }
    else if (a === '--keyword') { out.keyword = argv[++i]; }
    else if (a === '--geo') { out.geo = argv[++i]; }
    else if (a === '--lang') { out.lang = argv[++i]; }
    else if (a === '--depth') { out.depth = parseInt(argv[++i], 10) || 10; }
    else if (a === '--bodies') { out.bodies = true; }
  }
  // Also honor env var for programmatic callers
  if (process.env.SERP_FETCH_BODIES === '1') out.bodies = true;
  return out;
}

function usage() {
  process.stderr.write([
    'Usage: node serp-terms.mjs --keyword "<phrase>" [--geo US] [--lang en] [--depth 10] [--bodies]',
    '',
    'Fetches top organic SERP results for the keyword and extracts term/entity',
    'coverage hints for the blog draft phase. Output is JSON on stdout.',
    '',
    'Options:',
    '  --bodies  Fetch top-5 result page bodies for richer entity extraction.',
    '            Adds ~2-5s wall-clock. Any individual fetch failure is skipped.',
    '            Also enabled by SERP_FETCH_BODIES=1 in env.',
    '',
    'Exit codes:',
    '  0 — always (best-effort; missing creds → { status: "skipped" })',
    '  1 — missing --keyword argument',
    '',
    'Env:',
    '  DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD — DataForSEO Basic auth.',
    '    If either is unset, { status: "skipped" } is emitted and the script',
    '    exits 0. The blog-post skill treats this as a graceful no-op.',
    '  SERP_FETCH_BODIES=1 — equivalent to --bodies flag.',
    '',
    'Cache:',
    '  blog/pipeline/.cache/serp-terms.json, 7-day TTL, gitignored.',
    '',
  ].join('\n'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    usage();
    process.exit(0);
  }

  if (!args.keyword || !String(args.keyword).trim()) {
    process.stderr.write('[serp-terms] error: --keyword is required\n');
    usage();
    process.exit(1);
  }

  const keyword = String(args.keyword).trim();

  try {
    const { result } = await fetchSerpTerms(keyword, args.geo, args.lang, args.depth, args.bodies);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (err) {
    // Defensive catch: should never reach here (all errors handled above).
    log(`[serp-terms] FATAL (unexpected): ${err.stack || err.message}`);
    process.stdout.write(JSON.stringify({ status: 'skipped', reason: `unexpected: ${err.message}` }, null, 2) + '\n');
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    log(`[serp-terms] FATAL: ${err.stack || err.message}`);
    process.exit(0); // best-effort contract: always exit 0
  });
}

export {
  fetchSerpTerms,
  extractTermsAndEntities,
  extractEntityCandidates,
  stripHtml,
  queryTokens,
  isQueryEcho,
};
