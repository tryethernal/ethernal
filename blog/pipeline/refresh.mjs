#!/usr/bin/env node
/**
 * @fileoverview refresh.mjs — produces a structured refresh plan for an existing
 * blog post based on the GSC signal that surfaced it.
 *
 * Phase 4b of the search-feedback rollout (see
 * .claude/references/SERP-INTEGRATION-PLAN.md). Ported from the ronda blog
 * pipeline and adapted to ethernal-marketing:
 *
 *   - Posts live at blog/src/content/blog/<slug>.{md,mdx} (same layout as ronda).
 *   - ethernal publishes directly to develop with no review PR, so a refresh is a
 *     direct `chore(blog): refresh` commit on develop — NOT a draft PR. The plan
 *     therefore carries a `commit` block (prefix + message) instead of a `pr` block.
 *   - The frontmatter `preserve` list matches ethernal's Zod schema
 *     (content.config.ts): title, description, date, tags, keywords, image,
 *     ogImage, readingTime, status. There is no `author` field (posts hardcode
 *     "by Antoine" in PostLayout).
 *
 * Consumes the `mode: 'refresh'` envelope emitted by `index.js --pick`
 * (Phase 4c, findRefreshCandidate in project.js). draft.sh's refresh-mode
 * branch (Phase 4d) invokes this helper to get the plan, then executes it
 * (read post, edit targeted sections, re-run humanize on changed paragraphs,
 * set `updatedDate`, commit + push).
 *
 * Why a structured plan and not free-form analysis:
 *
 *   GSC signals are quantitative — a query at position 8 with 47 impressions
 *   tells you exactly which paragraphs need depth and which keyword to lean
 *   into. Producing a free-form goal loses that information; a structured plan
 *   moves the deterministic work into code and keeps the agent focused on the
 *   editorial judgment that actually benefits from LLM reasoning.
 *
 * CLI:
 *   node refresh.mjs --input /tmp/pick.json           # reads the pick envelope
 *   node refresh.mjs --slug <slug> --signal quick_win # synthetic; for testing
 *
 * Output (stdout, JSON): see buildPlan() return shape.
 *
 * Exit codes:
 *   0 — plan emitted on stdout
 *   2 — bad input (missing file, malformed JSON, no slug, unknown signal)
 *   1 — internal error
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// refresh.mjs lives at blog/pipeline/; posts live at blog/src/content/blog/.
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BLOG_POSTS_DIR = path.resolve(__dirname, '..', 'src', 'content', 'blog');

function log(...args) {
  process.stderr.write(args.map(String).join(' ') + '\n');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') out.input = argv[++i];
    else if (a === '--slug') out.slug = argv[++i];
    else if (a === '--signal') out.signal = argv[++i];
    else if (a === '--page') out.page = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

/**
 * Parse YAML frontmatter (the simple subset our posts use: scalar `k: v` +
 * arrays of strings via `key:` followed by indented `- item` lines).
 * Returns { frontmatter, body }. Defensive: never throws — returns empty
 * frontmatter on parse failure.
 * @param {string} text
 * @returns {{frontmatter: object, body: string}}
 */
export function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return { frontmatter: {}, body: text };
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return { frontmatter: {}, body: text };
  const raw = text.slice(4, end);
  const body = text.slice(end + 5);
  const fm = {};
  const lines = raw.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^([a-zA-Z][a-zA-Z0-9_]*):\s*(.*)$/);
    if (!m) continue;
    const [, key, valRaw] = m;
    const val = valRaw.trim();
    if (val === '') {
      // Array-of-strings on subsequent indented lines.
      const arr = [];
      while (i + 1 < lines.length && /^\s+-\s+/.test(lines[i + 1])) {
        i++;
        arr.push(lines[i].replace(/^\s+-\s+/, '').replace(/^["']|["']$/g, ''));
      }
      fm[key] = arr;
    } else {
      // Scalar — strip surrounding quotes if any.
      fm[key] = val.replace(/^["']|["']$/g, '');
    }
  }
  return { frontmatter: fm, body };
}

/**
 * Extract every H2 + the first paragraph beneath it. Used to surface
 * `targetParagraphs` — paragraph anchors the agent will know how to find.
 * @param {string} body
 * @returns {Array<{heading: string, startLine: number, snippet: string}>}
 */
export function extractStructure(body) {
  const lines = body.split('\n');
  const sections = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(.+?)\s*$/);
    if (!m) continue;
    const heading = m[1];
    let snippet = '';
    for (let j = i + 1; j < lines.length && j < i + 12; j++) {
      const t = lines[j].trim();
      if (!t) continue;
      if (/^#{1,6}\s/.test(t)) break; // hit the next heading
      snippet = t.slice(0, 180);
      break;
    }
    sections.push({ heading, startLine: i + 1, snippet });
  }
  return sections;
}

/**
 * Find which H2 sections best match a search query (for the quick_win signal —
 * expand the section(s) most semantically close to the query so the page
 * becomes more answer-y for it). Lightweight token-overlap heuristic, no LLM.
 * @param {Array} sections
 * @param {string} query
 * @returns {Array}
 */
export function matchSectionsToQuery(sections, query) {
  if (!query) return [];
  const stop = new Set(['a','an','and','as','at','be','but','by','for','from','has','have','in','is','it','its','of','on','or','the','to','with','this','that','how','why','what','when','where','vs','vs.']);
  const tokenize = (s) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t && !stop.has(t)),
    );
  const qTokens = tokenize(query);
  if (qTokens.size === 0) return [];
  const scored = sections.map((s) => {
    const sTokens = tokenize(s.heading + ' ' + s.snippet);
    let overlap = 0;
    for (const t of qTokens) if (sTokens.has(t)) overlap++;
    return { ...s, overlap };
  });
  const max = Math.max(...scored.map((s) => s.overlap));
  if (max === 0) return [];
  return scored.filter((s) => s.overlap === max).slice(0, 3);
}

async function gitLastModified(filePath) {
  return new Promise((resolve) => {
    const child = spawn('git', ['log', '-1', '--format=%aI', '--', filePath], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.on('close', () => resolve(out.trim() || null));
    child.on('error', () => resolve(null));
  });
}

function countWords(body) {
  return body
    .replace(/```[\s\S]*?```/g, '') // strip code blocks
    .replace(/\[[^\]]*\]\([^)]*\)/g, '$1') // unwrap links
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Build the refresh plan given the signal envelope + the post's parsed state.
 * Pure function; no I/O.
 * @param {{slug: string, signal: string, page: string, metrics: object, post: object}} args
 * @returns {object}
 */
export function buildPlan({ slug, signal, page, metrics, post }) {
  const today = new Date().toISOString().slice(0, 10);

  let strategy;
  let targetParagraphs = [];
  let checks = [];

  if (signal === 'quick_win') {
    strategy = 'expand_for_query';
    // Find which existing H2(s) best match the query the post is almost
    // ranking for. The agent deepens those paragraphs and adds 1–2 citations.
    const matches = metrics?.query ? matchSectionsToQuery(post.sections, metrics.query) : [];
    targetParagraphs = matches.map((m) => ({
      headingPath: [post.title, m.heading],
      lineHint: m.startLine,
      rationale: `H2 best matches the GSC query "${metrics.query}" (token overlap=${m.overlap}). Expand with 100–200 more words of depth, add 1–2 citations from primary sources, weave the query phrase naturally into the body once.`,
    }));
    // If no section matched, the post may not actually serve the query well —
    // the agent should consider adding a NEW H2 rather than torturing one.
    if (targetParagraphs.length === 0) {
      targetParagraphs.push({
        headingPath: [post.title],
        lineHint: null,
        rationale: `No existing H2 strongly matches the GSC query "${metrics?.query || '<unknown>'}". Consider either (a) adding a new H2 section that directly addresses the query, or (b) declining the refresh and commenting that the post doesn't actually serve this query well.`,
      });
    }
    checks = [
      'For every numerical claim added to changed paragraphs, WebFetch the source URL and verify the stat appears there (source-claim check, scoped to changes).',
      'The GSC query phrase appears in the body once, naturally — not stuffed.',
      `If the existing title doesn't contain the query "${metrics?.query || ''}" AND the average position from GSC is > 12, also tighten the title to better match intent. Otherwise leave it untouched.`,
      'No em-dashes in any added/changed text. No banned phrases (delve into, in today\'s digital landscape, additionally, crucial, diverse, robust as praise). No subtle AI scaffolding ("The practical implication is...", "That\'s real.", spelled-out percentages).',
      `Set frontmatter updatedDate: ${today}.`,
    ];
  } else if (signal === 'decay') {
    strategy = 'verify_and_update';
    // Decay is structural — the post is slipping but we don't know which
    // section is responsible. Re-verify every cited number against its source
    // and update anything stale. Target every H2; the agent prunes the rest.
    targetParagraphs = post.sections.map((s) => ({
      headingPath: [post.title, s.heading],
      lineHint: s.startLine,
      rationale: `Decay signal — clicks dropped ${metrics?.deltaPct != null ? (metrics.deltaPct * 100).toFixed(0) + '%' : '?'} vs prior 28d. Re-verify every numerical claim, replace stale tool/product names, refresh any examples that have changed since the post shipped.`,
    }));
    checks = [
      'For EVERY numerical claim in the post body (not just changed ones), WebFetch the source URL and verify the stat still appears there. If a source page changed the number, replace it. If the source is gone, find an equivalent or remove the claim.',
      'For every named tool/product/study mentioned, verify it still exists and the name is current. Companies rebrand, products get sunset, studies get retracted. Replace stale references.',
      'Do NOT rewrite the voice or restructure the post — decay-mode is surgical, not full-rewrite.',
      'No em-dashes in changed text. Banned-phrase + AI-tell sweep on changed paragraphs only.',
      `Set frontmatter updatedDate: ${today}.`,
    ];
  } else if (signal === 'ctr_opportunity') {
    strategy = 'rewrite_title_meta_only';
    // Page already ranks (>=100 impressions) but CTR is far below position-
    // expected. The body is fine; only title + description need a rewrite.
    targetParagraphs = [];
    const ctrPct = metrics?.ctr != null ? (metrics.ctr * 100).toFixed(2) : '?';
    const expCtrPct = metrics?.expectedCtr != null ? (metrics.expectedCtr * 100).toFixed(2) : '?';
    const gapPct = metrics?.gap != null ? (metrics.gap * 100).toFixed(0) : '?';
    checks = [
      `Rewrite the frontmatter \`title\` to better match searcher intent for position ${metrics?.position ?? '?'}. Keep it under 65 characters for clean SERP display. Voice: em-dash-free, opinionated, specific — not generic.`,
      `Rewrite the frontmatter \`description\` to lift CTR from the current ${ctrPct}% toward the position-expected ${expCtrPct}% (gap ratio ${gapPct}%). Hard limit: <=160 chars (Zod build cap — the build fails if exceeded, self-check before committing). Use a curiosity gap or concrete benefit; avoid repeating the title word-for-word.`,
      'Do NOT touch the post body. This strategy rewrites exactly two frontmatter fields: title and description. Any other change is out of scope.',
      `Set frontmatter updatedDate: ${today}.`,
      'Run `cd blog && npx astro sync` after editing — the Zod schema validates description <=160 chars and the build fails hard over it.',
    ];
  } else {
    // Unknown / future signal. Fail loudly rather than guess.
    throw new Error(`unknown refresh signal: ${signal} (expected 'quick_win', 'decay', or 'ctr_opportunity')`);
  }

  // rewrite_title_meta_only: title + description are the TARGETS of the rewrite,
  // so they must NOT be in preserve[]. All other fields stay intact.
  // expand_for_query / verify_and_update: title + description are preserved (the
  // title may be touched by expand_for_query only under the position>12 rule,
  // governed by plan.checks, not the preserve list).
  // Fields mirror ethernal's content.config.ts schema (no `author` field).
  const preserveAlways = ['date', 'tags', 'keywords', 'image', 'ogImage', 'readingTime', 'status'];
  const preserve =
    strategy === 'rewrite_title_meta_only'
      ? preserveAlways
      : ['title', 'description', ...preserveAlways];

  return {
    strategy,
    targetParagraphs,
    checks,
    frontmatter: {
      set: { updatedDate: today },
      preserve,
    },
    // ethernal publishes directly to develop (no review PR). A refresh is a
    // direct commit with the `chore(blog): refresh` prefix so it's
    // distinguishable from `blog: publish` commits in the log.
    commit: {
      prefix: 'chore(blog): refresh',
      message: `chore(blog): refresh "${post.title}" (${signal})`,
    },
  };
}

/**
 * Load a post by slug, parse its frontmatter + structure, and gather metadata.
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
export async function loadPost(slug) {
  for (const ext of ['md', 'mdx']) {
    const p = path.join(BLOG_POSTS_DIR, `${slug}.${ext}`);
    try {
      const text = await fs.readFile(p, 'utf8');
      const { frontmatter, body } = parseFrontmatter(text);
      const sections = extractStructure(body);
      const hasReferencesTable = /^##\s+References\s*$/m.test(body);
      const wordCount = countWords(body);
      const lastModifiedFromGit = await gitLastModified(p);
      return {
        filePath: path.relative(REPO_ROOT, p),
        title: frontmatter.title || slug,
        date: frontmatter.date || null,
        description: frontmatter.description || '',
        wordCount,
        hasReferencesTable,
        sections,
        lastModifiedFromGit,
      };
    } catch {
      /* keep looking */
    }
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      'Usage:\n' +
        '  node refresh.mjs --input /tmp/pick.json\n' +
        '  node refresh.mjs --slug <slug> --signal quick_win [--page <url>]\n' +
        '\nProduces a structured refresh plan for the draft.sh refresh-mode branch.\n',
    );
    return;
  }

  let envelope;
  if (args.input) {
    try {
      const raw = await fs.readFile(args.input, 'utf8');
      const j = JSON.parse(raw);
      if (j.mode !== 'refresh') {
        log(`input file is not a refresh envelope (mode=${j.mode}); nothing to do`);
        process.exit(2);
      }
      envelope = { ...j.refresh };
    } catch (err) {
      log(`failed to read --input: ${err.message}`);
      process.exit(2);
    }
  } else if (args.slug && args.signal) {
    envelope = {
      slug: args.slug,
      signal: args.signal,
      page: args.page || `https://tryethernal.com/blog/${args.slug}`,
      metrics: {},
    };
  } else {
    log('missing required input — pass --input <pick.json> OR --slug + --signal');
    process.exit(2);
  }

  const post = await loadPost(envelope.slug);
  if (!post) {
    log(`post file not found for slug "${envelope.slug}" (looked in ${BLOG_POSTS_DIR})`);
    process.exit(2);
  }

  let plan;
  try {
    plan = buildPlan({
      slug: envelope.slug,
      signal: envelope.signal,
      page: envelope.page,
      metrics: envelope.metrics || {},
      post,
    });
  } catch (err) {
    log(`buildPlan failed: ${err.message}`);
    process.exit(2);
  }

  const out = {
    slug: envelope.slug,
    filePath: post.filePath,
    signal: envelope.signal,
    page: envelope.page,
    metrics: envelope.metrics || {},
    post: {
      title: post.title,
      date: post.date,
      description: post.description,
      wordCount: post.wordCount,
      hasReferencesTable: post.hasReferencesTable,
      lastModifiedFromGit: post.lastModifiedFromGit,
    },
    plan,
  };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    log(`FATAL: ${err.stack || err.message}`);
    process.exit(1);
  });
}
