// blog/pipeline/keyword-providers/dataforseo.mjs
//
// DataForSEO Keyword Data API → keyword ideas with monthly search volume,
// competition, and CPC. Used by `enrich-keywords.mjs`.
//
// Endpoint: POST https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live
//   docs: https://docs.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live
//
// Auth: Basic auth with login + password. Both come from env:
//   DATAFORSEO_LOGIN
//   DATAFORSEO_PASSWORD
//
// Both unset → throws { code: 'NO_KEY' } so the caller can fall back to no-op
// enrichment. Network / 4xx / 5xx → typed errors so the caller can decide
// whether to retry (we don't, per spec — best-effort, never fatal).
//
// One function exported:
//   fetchKeywordIdeas({ seeds: string[], geo?: string, lang?: string, limit?: number })
//     → Promise<Array<{ phrase, volume, competition, source }>>
//
// Where:
//   - geo defaults to 'US' (location_code 2840)
//   - lang defaults to 'en' (language_code 'en')
//   - limit caps the API request size (default 50, max 1000 per the API)
//   - competition normalizes DataForSEO's `competition_level` to
//     'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'
//   - source is always 'dataforseo' so consumers can tell the provider apart
//     in the cache without re-deriving from elsewhere

// Hard-coded Google location/language codes for the v1 US-English target.
// If we later need EU/UK, look up additional codes via the locations endpoint
// (https://docs.dataforseo.com/v3/keywords_data/google_ads/locations/) and
// add a small map here.
const GEO_TO_LOCATION_CODE = {
  US: 2840,
  GB: 2826,
  CA: 2124,
};

const LANG_TO_LANGUAGE_CODE = {
  en: 'en',
};

const API_BASE = 'https://api.dataforseo.com/v3';

class KeywordProviderError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'KeywordProviderError';
    this.code = code;
  }
}

function normalizeCompetition(level) {
  if (level == null) return 'UNKNOWN';
  const s = String(level).toUpperCase();
  if (s === 'LOW' || s === 'MEDIUM' || s === 'HIGH') return s;
  // DataForSEO occasionally returns numeric competition (0-1). Bucket it.
  const n = Number(level);
  if (Number.isFinite(n)) {
    if (n < 0.34) return 'LOW';
    if (n < 0.67) return 'MEDIUM';
    return 'HIGH';
  }
  return 'UNKNOWN';
}

function authHeader() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new KeywordProviderError(
      'NO_KEY',
      'DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD not set',
    );
  }
  const token = Buffer.from(`${login}:${password}`).toString('base64');
  return `Basic ${token}`;
}

/**
 * Fetch keyword ideas seeded from a list of phrases.
 *
 * @param {Object} opts
 * @param {string[]} opts.seeds   - Seed phrases (e.g. candidate title + tags). 1-20 recommended.
 * @param {string}   [opts.geo]   - ISO country code. Defaults to 'US'.
 * @param {string}   [opts.lang]  - Language code. Defaults to 'en'.
 * @param {number}   [opts.limit] - Max ideas to return. Defaults to 50, max 1000.
 * @returns {Promise<Array<{ phrase: string, volume: number, competition: string, source: 'dataforseo' }>>}
 */
export async function fetchKeywordIdeas({ seeds, geo = 'US', lang = 'en', limit = 50 }) {
  if (!Array.isArray(seeds) || seeds.length === 0) {
    throw new KeywordProviderError('BAD_INPUT', 'seeds must be a non-empty array');
  }

  const locationCode = GEO_TO_LOCATION_CODE[geo];
  if (!locationCode) {
    throw new KeywordProviderError(
      'BAD_INPUT',
      `unsupported geo "${geo}" — add to GEO_TO_LOCATION_CODE in dataforseo.mjs`,
    );
  }
  const languageCode = LANG_TO_LANGUAGE_CODE[lang];
  if (!languageCode) {
    throw new KeywordProviderError(
      'BAD_INPUT',
      `unsupported lang "${lang}" — add to LANG_TO_LANGUAGE_CODE in dataforseo.mjs`,
    );
  }

  // DataForSEO accepts up to 20 seed keywords per task. Truncate defensively.
  const cleanedSeeds = seeds
    .map((s) => String(s || '').trim())
    .filter((s) => s.length > 0 && s.length <= 80)
    .slice(0, 20);

  if (cleanedSeeds.length === 0) {
    throw new KeywordProviderError('BAD_INPUT', 'no usable seeds after cleanup');
  }

  const body = [
    {
      keywords: cleanedSeeds,
      location_code: locationCode,
      language_code: languageCode,
      include_adult_keywords: false,
      sort_by: 'search_volume',
      limit: Math.min(Math.max(limit, 1), 1000),
    },
  ];

  const url = `${API_BASE}/keywords_data/google_ads/keywords_for_keywords/live`;

  // Compute auth header up front so a missing-creds error surfaces as NO_KEY,
  // not as NETWORK (the latter would imply a transient failure worth retrying).
  // KeywordProviderError thrown here propagates to the caller untouched.
  const auth = authHeader();

  // 30s hard timeout — the live endpoint is normally sub-second but a hung
  // DataForSEO would block the script (and the multica agent run) until the
  // outer dispatcher times out. AbortSignal.timeout requires Node 18+ which
  // we already require via engines.node ">=20".
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    // fetch() throws on DNS/network errors before any HTTP status comes back,
    // AND on AbortSignal.timeout firing (err.name === 'TimeoutError').
    if (err?.name === 'TimeoutError') {
      throw new KeywordProviderError('NETWORK', 'request timed out after 30s');
    }
    throw new KeywordProviderError('NETWORK', `network error: ${err.message}`);
  }

  if (res.status === 401 || res.status === 403) {
    throw new KeywordProviderError(
      'AUTH',
      `dataforseo auth rejected: HTTP ${res.status}`,
    );
  }
  if (res.status === 429) {
    throw new KeywordProviderError('QUOTA', 'dataforseo quota / rate limit hit');
  }
  if (!res.ok) {
    let bodyText = '';
    try {
      bodyText = (await res.text()).slice(0, 500);
    } catch {}
    throw new KeywordProviderError(
      'UNKNOWN',
      `dataforseo HTTP ${res.status}: ${bodyText}`,
    );
  }

  let payload;
  try {
    payload = await res.json();
  } catch (err) {
    throw new KeywordProviderError('UNKNOWN', `dataforseo non-JSON response: ${err.message}`);
  }

  // DataForSEO wraps everything: { status_code, tasks: [{ status_code, result: [{ items: [...] }] }] }
  if (payload?.status_code && payload.status_code >= 40000) {
    throw new KeywordProviderError(
      'UNKNOWN',
      `dataforseo status_code ${payload.status_code}: ${payload.status_message || 'no message'}`,
    );
  }

  const task = Array.isArray(payload?.tasks) ? payload.tasks[0] : null;
  if (!task) {
    throw new KeywordProviderError('UNKNOWN', 'dataforseo response missing tasks[0]');
  }
  if (task.status_code && task.status_code >= 40000) {
    throw new KeywordProviderError(
      'UNKNOWN',
      `dataforseo task error ${task.status_code}: ${task.status_message || 'no message'}`,
    );
  }

  // result is an array containing one entry; items is its keyword-idea list.
  const result = Array.isArray(task.result) ? task.result[0] : null;
  const items = Array.isArray(result?.items) ? result.items : Array.isArray(task.result) ? task.result : [];

  // Normalize. The endpoint returns keyword strings under `keyword`, monthly
  // volume under `search_volume`, and `competition_index` / `competition`.
  const ideas = [];
  for (const it of items) {
    const phrase = String(it?.keyword || '').trim();
    if (!phrase) continue;
    const volume = Number(it?.search_volume);
    if (!Number.isFinite(volume)) continue;
    const competition = normalizeCompetition(it?.competition_level ?? it?.competition);
    ideas.push({
      phrase,
      volume,
      competition,
      source: 'dataforseo',
    });
  }
  return ideas;
}

/**
 * Fetch top organic SERP results for a keyword.
 *
 * @param {Object} opts
 * @param {string}  opts.keyword  - Keyword to search for (e.g. "feature flags for product teams")
 * @param {string}  [opts.geo]    - ISO country code. Defaults to 'US'.
 * @param {string}  [opts.lang]   - Language code. Defaults to 'en'.
 * @param {number}  [opts.depth]  - Number of organic results to return. Defaults to 10.
 * @returns {Promise<{
 *   organicResults: Array<{ rank: number, title: string, url: string, snippet: string }>,
 *   relatedSearches: string[],
 *   peopleAlsoAsk: string[]
 * }>}
 */
export async function fetchSerpOrganic({ keyword, geo = 'US', lang = 'en', depth = 10 }) {
  if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
    throw new KeywordProviderError('BAD_INPUT', 'keyword must be a non-empty string');
  }

  const locationCode = GEO_TO_LOCATION_CODE[geo];
  if (!locationCode) {
    throw new KeywordProviderError(
      'BAD_INPUT',
      `unsupported geo "${geo}" — add to GEO_TO_LOCATION_CODE in dataforseo.mjs`,
    );
  }
  const languageCode = LANG_TO_LANGUAGE_CODE[lang];
  if (!languageCode) {
    throw new KeywordProviderError(
      'BAD_INPUT',
      `unsupported lang "${lang}" — add to LANG_TO_LANGUAGE_CODE in dataforseo.mjs`,
    );
  }

  const body = [
    {
      keyword: keyword.trim().slice(0, 700),
      location_code: locationCode,
      language_code: languageCode,
      depth: Math.min(Math.max(depth, 1), 100),
    },
  ];

  const url = `${API_BASE}/serp/google/organic/live/advanced`;
  const auth = authHeader();

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    if (err?.name === 'TimeoutError') {
      throw new KeywordProviderError('NETWORK', 'request timed out after 30s');
    }
    throw new KeywordProviderError('NETWORK', `network error: ${err.message}`);
  }

  if (res.status === 401 || res.status === 403) {
    throw new KeywordProviderError('AUTH', `dataforseo auth rejected: HTTP ${res.status}`);
  }
  if (res.status === 429) {
    throw new KeywordProviderError('QUOTA', 'dataforseo quota / rate limit hit');
  }
  if (!res.ok) {
    let bodyText = '';
    try { bodyText = (await res.text()).slice(0, 500); } catch {}
    throw new KeywordProviderError('UNKNOWN', `dataforseo HTTP ${res.status}: ${bodyText}`);
  }

  let payload;
  try {
    payload = await res.json();
  } catch (err) {
    throw new KeywordProviderError('UNKNOWN', `dataforseo non-JSON response: ${err.message}`);
  }

  if (payload?.status_code && payload.status_code >= 40000) {
    throw new KeywordProviderError(
      'UNKNOWN',
      `dataforseo status_code ${payload.status_code}: ${payload.status_message || 'no message'}`,
    );
  }

  const task = Array.isArray(payload?.tasks) ? payload.tasks[0] : null;
  if (!task) {
    throw new KeywordProviderError('UNKNOWN', 'dataforseo response missing tasks[0]');
  }
  if (task.status_code && task.status_code >= 40000) {
    throw new KeywordProviderError(
      'UNKNOWN',
      `dataforseo task error ${task.status_code}: ${task.status_message || 'no message'}`,
    );
  }

  const result = Array.isArray(task.result) ? task.result[0] : null;
  const items = Array.isArray(result?.items) ? result.items : [];

  const organicResults = [];
  const relatedSearches = [];
  const peopleAlsoAsk = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const type = String(item.type || '').toLowerCase();

    if (type === 'organic') {
      const rank = Number(item.rank_group ?? item.rank_absolute ?? organicResults.length + 1);
      const title = String(item.title || '').trim();
      const url = String(item.url || item.domain || '').trim();
      const snippet = String(item.description || item.snippet || '').trim();
      if (title || url) {
        organicResults.push({ rank, title, url, snippet });
      }
    } else if (type === 'related_searches') {
      // related_searches has a nested items array
      const nested = Array.isArray(item.items) ? item.items : [];
      for (const r of nested) {
        const q = String(r?.query || r?.title || '').trim();
        if (q) relatedSearches.push(q);
      }
    } else if (type === 'people_also_ask') {
      const nested = Array.isArray(item.items) ? item.items : [];
      for (const p of nested) {
        const q = String(p?.title || p?.seed_question || '').trim();
        if (q) peopleAlsoAsk.push(q);
      }
    }
  }

  return { organicResults, relatedSearches, peopleAlsoAsk };
}

// Exported for tests / smoke fixtures that want a stable in-process provider
// without hitting the network.
export { KeywordProviderError, normalizeCompetition };
