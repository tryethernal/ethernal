/**
 * @fileoverview GitHub Projects V2 integration using draft items (no issues).
 * Creates draft cards on the project board with custom field values.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { access } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PROJECT } from './config.js';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// Astro blog posts live at blog/src/content/blog/<slug>.{md,mdx}.
const BLOG_POSTS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'blog');

/**
 * Reads `date:` from a published article's frontmatter. Returns ISO date or '' if
 * the file is missing or unparseable. Used to order Published cards chronologically
 * — articlePath is just a slug (no date prefix), so lexicographic sort would lie.
 */
function getArticleDate(articlePath) {
  if (!articlePath) return '';
  const abs = join(REPO_ROOT, articlePath);
  if (!existsSync(abs)) return '';
  try {
    const content = readFileSync(abs, 'utf-8');
    const match = content.match(/^date:\s*(\S+)/m);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

/**
 * Derive a blog post slug from a GSC `page` URL. GSC returns canonical URLs
 * like `https://tryethernal.com/blog/<slug>` (with or without a trailing
 * slash). Only URLs under `/blog/` with a single non-empty slug segment map
 * to a post. Returns the slug, or null when the URL isn't a blog post page.
 * @param {string} pageUrl
 * @returns {string|null}
 */
export function slugFromPageUrl(pageUrl) {
  if (!pageUrl || typeof pageUrl !== 'string') return null;
  let u;
  try {
    u = new URL(pageUrl);
  } catch {
    return null;
  }
  const m = u.pathname.match(/^\/blog\/([^/]+)\/?$/);
  if (!m) return null;
  const slug = m[1];
  // Defensive: GSC URLs are sanitized, but only accept slug-shaped segments.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return null;
  return slug;
}

/**
 * Verify a slug maps to an existing post file (.md or .mdx). Returns the
 * absolute path when found, else null.
 * @param {string} slug
 * @returns {Promise<string|null>}
 */
export async function postExists(slug) {
  for (const ext of ['md', 'mdx']) {
    const p = join(BLOG_POSTS_DIR, `${slug}.${ext}`);
    try {
      await access(p);
      return p;
    } catch {
      /* keep looking */
    }
  }
  return null;
}

/**
 * Find a refresh candidate from GSC signals, in priority order:
 *   1. quickWins        — query at position 4–15, >=50 impressions
 *                         (almost-ranking; highest leverage).
 *   2. contentDecay     — page lost >=30% clicks vs prior 28d (defensive).
 *   3. ctrOpportunities — page ranks (>=100 impressions) but CTR <= 50% of
 *                         position-expected (cheapest fix — title/meta only).
 *
 * Content signals (1 + 2) outrank the copy signal (3): a page whose clicks are
 * falling needs substance; a page that merely under-clicks needs a better
 * title. For each candidate, the `page` URL must map to a slug whose post file
 * exists in the repo — otherwise the signal is meaningless and we skip it.
 *
 * Returns the refresh envelope `{ slug, filePath, signal, page, metrics }`, or
 * null when GSC was skipped, no signals fired, or none mapped to a real post.
 * Caller then falls through to pickNextTopic() (new-post mode).
 * @param {object} gsc - Envelope from fetchGscSignals() in gsc.mjs.
 * @returns {Promise<object|null>}
 */
export async function findRefreshCandidate(gsc) {
  if (!gsc || gsc.status !== 'ok') return null;

  const rel = (p) => p.slice(REPO_ROOT.length + 1);

  // Priority 1: quickWins (signal carries both query and page).
  for (const w of Array.isArray(gsc.quickWins) ? gsc.quickWins : []) {
    const slug = slugFromPageUrl(w.page);
    if (!slug) continue;
    const filePath = await postExists(slug);
    if (!filePath) continue;
    return {
      slug,
      filePath: rel(filePath),
      signal: 'quick_win',
      page: w.page,
      metrics: { query: w.query, clicks: w.clicks, impressions: w.impressions, ctr: w.ctr, position: w.position },
    };
  }

  // Priority 2: contentDecay.
  for (const d of Array.isArray(gsc.contentDecay) ? gsc.contentDecay : []) {
    const slug = slugFromPageUrl(d.page);
    if (!slug) continue;
    const filePath = await postExists(slug);
    if (!filePath) continue;
    return {
      slug,
      filePath: rel(filePath),
      signal: 'decay',
      page: d.page,
      metrics: { clicksRecent: d.clicksRecent, clicksPrior: d.clicksPrior, deltaPct: d.deltaPct },
    };
  }

  // Priority 3: ctrOpportunities (sorted worst-gap-first by gsc.mjs).
  for (const c of Array.isArray(gsc.ctrOpportunities) ? gsc.ctrOpportunities : []) {
    const slug = slugFromPageUrl(c.page);
    if (!slug) continue;
    const filePath = await postExists(slug);
    if (!filePath) continue;
    return {
      slug,
      filePath: rel(filePath),
      signal: 'ctr_opportunity',
      page: c.page,
      metrics: {
        clicks: c.clicks,
        impressions: c.impressions,
        ctr: c.ctr,
        position: c.position,
        expectedCtr: c.expectedCtr,
        gap: c.gap,
      },
    };
  }

  return null;
}

/**
 * Set custom fields on a project item.
 * @param {string} itemId - Project item ID
 * @param {{cluster: string, score: number, items: Array, contentType: string}} topic
 */
function setProjectFields(itemId, topic, { includeStatus = true } = {}) {
  const baseInput = `projectId: "${PROJECT.id}", itemId: "${itemId}"`;

  // Use the keyword-enriched finalScore when present (rounded — the GitHub
  // number field is whole-number friendly), falling back to the editorial
  // score. This makes pickNextTopic's score-based ordering reflect search
  // demand without changing how the field is read.
  const trendScoreValue = Math.round(topic.finalScore ?? topic.score);

  const fields = [
    { fieldId: PROJECT.fields.trendScore, value: `number: ${trendScoreValue}` },
    ...(includeStatus
      ? [{ fieldId: PROJECT.fields.status, value: `singleSelectOptionId: "${PROJECT.statusOptions.detected}"` }]
      : []),
  ];

  const clusterOptionId = PROJECT.clusterOptions[topic.cluster];
  if (clusterOptionId) {
    fields.push({ fieldId: PROJECT.fields.topicCluster, value: `singleSelectOptionId: "${clusterOptionId}"` });
  }

  const contentTypeOptionId = PROJECT.contentTypeOptions[topic.contentType];
  if (contentTypeOptionId) {
    fields.push({ fieldId: PROJECT.fields.contentType, value: `singleSelectOptionId: "${contentTypeOptionId}"` });
  }

  for (const { fieldId, value } of fields) {
    try {
      const raw = execSync(
        `gh api graphql -f query='mutation { updateProjectV2ItemFieldValue(input: { ${baseInput}, fieldId: "${fieldId}", value: { ${value} } }) { projectV2Item { id } } }'`,
        { encoding: 'utf-8', timeout: 15000 }
      );
      const parsed = JSON.parse(raw);
      if (parsed.errors?.length) {
        throw new Error(parsed.errors.map(e => e.message).join('; '));
      }
    } catch (err) {
      console.warn(`  Warning: Failed to set field: ${err.message.slice(0, 100)}`);
    }
  }

  // Source links — use --input to avoid shell escaping issues with URLs
  const sourceLinks = topic.items.slice(0, 5).map(i => i.url).join(' | ');
  try {
    const raw = execSync(
      'gh api graphql --input -',
      {
        encoding: 'utf-8',
        timeout: 15000,
        input: JSON.stringify({
          query: `mutation($text: String!) { updateProjectV2ItemFieldValue(input: { ${baseInput}, fieldId: "${PROJECT.fields.sourceLinks}", value: { text: $text } }) { projectV2Item { id } } }`,
          variables: { text: sourceLinks },
        }),
      }
    );
    const parsed = JSON.parse(raw);
    if (parsed.errors?.length) {
      throw new Error(parsed.errors.map(e => e.message).join('; '));
    }
  } catch (err) {
    console.warn(`  Warning: Failed to set source links: ${err.message.slice(0, 100)}`);
  }
}

/**
 * Render the keyword-enrichment block for the card body, when present.
 * Returns '' when the topic was not enriched (no DataForSEO creds, provider
 * failure, or no keywords passed the filters) so unenriched cards are
 * byte-identical to pre-enrichment behavior.
 * @param {object} topic
 * @returns {string}
 */
function buildKeywordBlock(topic) {
  const kws = Array.isArray(topic.keywordsEnriched) ? topic.keywordsEnriched : [];
  if (kws.length === 0) return '';
  const primary = topic.primaryKeyword;
  const rows = kws
    .slice(0, 8)
    .map(k => {
      const isPrimary = primary && k.phrase === primary;
      return `- **${k.phrase}** — ${k.volume}/mo, ${k.competition}${isPrimary ? ' (primary)' : ''}`;
    })
    .join('\n');
  const finalLine = topic.finalScore != null && topic.finalScore !== topic.score
    ? `\n**Final score (with keyword boost):** ${topic.finalScore}`
    : '';
  return `\n\n### Top keywords (search intent)${finalLine}\n${rows}`;
}

/**
 * Extract the primary keyword from a card body's "Top keywords" block.
 * The block (written by buildKeywordBlock) marks the primary row with
 * "(primary)". Returns the phrase, or '' when the card wasn't enriched.
 * Used by draft.sh to seed serp-terms.mjs and the draft prompts.
 * @param {string} body
 * @returns {string}
 */
export function parsePrimaryKeyword(body) {
  if (!body || typeof body !== 'string') return '';
  // Match: "- **<phrase>** — <vol>/mo, <COMP> (primary)"
  const m = body.match(/^-\s+\*\*(.+?)\*\*\s+[—-].*\(primary\)\s*$/m);
  return m ? m[1].trim() : '';
}

/**
 * Build the card body markdown.
 * @param {{label: string, score: number, items: Array, contentType: string, counts: object}} topic
 * @returns {string}
 */
function buildCardBody(topic) {
  const sourceList = topic.items
    .slice(0, 10)
    .map(item => `- [${item.title}](${item.url}) (${item.source}, ${new Date(item.date).toLocaleDateString()})`)
    .join('\n');
  const keywordBlock = buildKeywordBlock(topic);

  return `## Trend: ${topic.label}\n\n**Score:** ${topic.score}\n**Content Type:** ${topic.contentType}\n\n### Source Counts\n| Source | Count |\n|--------|-------|\n| EIPs | ${topic.counts.eip || 0} |\n| ERCs | ${topic.counts.erc || 0} |\n| ethresear.ch | ${topic.counts.ethresearch || 0} |\n| arxiv | ${topic.counts.arxiv || 0} |\n| Ethereum Magicians | ${topic.counts.magicians || 0} |\n\n### Sources\n${sourceList}${keywordBlock}\n\n---\n*Last updated ${new Date().toISOString().split('T')[0]}*`;
}

/**
 * Get all project items with their status and cluster fields.
 * @returns {Array<{id: string, title: string, status: string, cluster: string, score: number, body: string}>}
 */
export function getProjectItems() {
  try {
    const result = execSync(
      `gh project item-list ${PROJECT.number} --owner ${PROJECT.owner} --format json --limit 200`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    const data = JSON.parse(result);
    return (data.items || []).map(item => ({
      id: item.id,
      title: item.title,
      status: item.status || item.Status || '',
      cluster: item['topic Cluster'] || item['Topic Cluster'] || '',
      score: item['trend Score'] || item['Trend Score'] || 0,
      contentType: item['content Type'] || item['Content Type'] || '',
      sourceLinks: item['source Links'] || item['Source Links'] || '',
      articlePath: item['article Path'] || item['Article Path'] || '',
      body: item.content?.body || '',
    }));
  } catch (err) {
    console.error('Failed to fetch project items:', err.message);
    throw new Error(`getProjectItems failed: ${err.message}`);
  }
}

/**
 * Comparison-listicle cadence: schedule one every N picks. "Best block
 * explorers in 2026" is our highest sustained-traffic format (~2.0 vis/day)
 * but the trend pipeline doesn't generate them, so the picker forces one
 * whenever the recent published streak hasn't included one.
 */
const LISTICLE_CADENCE = 4;

/**
 * Pick the next topic for the every-2-day cadence using round-robin.
 * Selects the highest-scoring "Detected" card whose cluster doesn't
 * already have an active card (in Researched or Drafting status).
 *
 * Comparison-listicle override: if no comparison-listicle has been published
 * in the last LISTICLE_CADENCE-1 articles, force-pick one from the Detected
 * pool (highest-scoring listicle, ignoring cluster contention).
 *
 * When no Detected/Backlog candidates remain, recycles the highest-scoring
 * Published card so the pipeline keeps producing fresh angles on hot topics.
 *
 * @param {boolean} dryRun
 * @returns {object | null} picked item with body content
 */
export function pickNextTopic(dryRun = false) {
  const items = getProjectItems();

  // Both Researched and Drafting mean a cluster is actively being worked on
  const activeClusters = new Set(
    items
      .filter(i => i.status === 'Researched' || i.status === 'Drafting')
      .map(i => i.cluster)
      .filter(Boolean)
  );

  // Listicle cadence override: count published articles since the last listicle.
  // If we've gone LISTICLE_CADENCE-1 articles without one, pick a listicle next.
  // Order chronologically by frontmatter `date:` (articlePath is a slug, not
  // date-prefixed, so lexicographic sort would mis-order).
  const publishedReverseChrono = items
    .filter(i => i.status === 'Published')
    .map(i => ({ ...i, _date: getArticleDate(i.articlePath) }))
    .sort((a, b) => (b._date || '').localeCompare(a._date || ''));
  let articlesSinceListicle = 0;
  for (const p of publishedReverseChrono) {
    if (p.contentType === 'comparison-listicle' || p.contentType === 'Comparison Listicle') break;
    articlesSinceListicle += 1;
    if (articlesSinceListicle >= LISTICLE_CADENCE) break;
  }
  const forceListicle = articlesSinceListicle >= LISTICLE_CADENCE - 1;

  if (forceListicle) {
    const listicleCandidates = items
      .filter(i => i.status === 'Detected' || i.status === 'Backlog')
      .filter(i => i.contentType === 'comparison-listicle' || i.contentType === 'Comparison Listicle')
      .sort((a, b) => b.score - a.score);
    if (listicleCandidates.length > 0) {
      const picked = listicleCandidates[0];
      console.log(`  Listicle cadence triggered (${articlesSinceListicle} articles since last) — picking: "${picked.title}"`);
      if (!picked.body) {
        try {
          const result = execSync(
            `gh api graphql -f query='{ node(id: "${picked.id}") { ... on ProjectV2Item { content { ... on DraftIssue { body } ... on Issue { body } } } } }' --jq -r '.data.node.content.body // ""'`,
            { encoding: 'utf-8', timeout: 15000 }
          );
          picked.body = result.trim();
        } catch {}
      }
      if (dryRun) {
        console.log(`  [DRY RUN] Would pick: "${picked.title}" (listicle override)`);
      }
      return picked;
    }
    console.log(`  Listicle cadence triggered but no listicle candidates available — falling back to normal pick`);
  }

  let candidates = items
    .filter(i => i.status === 'Detected' || i.status === 'Backlog')
    .filter(i => i.cluster !== 'Emerging' && i.cluster !== '')
    .filter(i => !activeClusters.has(i.cluster))
    .sort((a, b) => b.score - a.score);

  // Fallback: recycle Published cards when no fresh topics are available.
  // Randomly pick from the top 3 highest-scoring published topics so consecutive
  // runs don't always recycle the same card before the weekly trend scan repopulates.
  if (candidates.length === 0) {
    console.log('  No Detected/Backlog topics available — recycling from top Published topics');
    const published = items
      .filter(i => i.status === 'Published')
      .filter(i => i.cluster !== 'Emerging' && i.cluster !== '')
      .filter(i => !activeClusters.has(i.cluster))
      .sort((a, b) => b.score - a.score);
    const pool = published.slice(0, 3);
    if (pool.length > 0) {
      // Shuffle the top pool so each run has a chance to pick a different topic
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      candidates = pool;
    }
  }

  if (candidates.length === 0) {
    console.log('  No eligible topics to pick (all clusters have active work)');
    return null;
  }

  const picked = candidates[0];

  // Fetch body via GraphQL if not available from item-list
  if (!picked.body) {
    try {
      const result = execSync(
        `gh api graphql -f query='{ node(id: "${picked.id}") { ... on ProjectV2Item { content { ... on DraftIssue { body } ... on Issue { body } } } } }' --jq -r '.data.node.content.body // ""'`,
        { encoding: 'utf-8', timeout: 15000 }
      ).trim();
      picked.body = result === 'null' ? '' : result;
    } catch {
      picked.body = '';
    }
  }

  if (dryRun) {
    console.log(`  [DRY RUN] Would pick: "${picked.title}" (score: ${picked.score}, cluster: ${picked.cluster})`);
    if (activeClusters.size > 0) {
      console.log(`  Skipped clusters (active): ${[...activeClusters].join(', ')}`);
    }
    return picked;
  }

  console.log(`  Picked: "${picked.title}" (score: ${picked.score})`);
  if (activeClusters.size > 0) {
    console.log(`  Skipped clusters (active): ${[...activeClusters].join(', ')}`);
  }

  return picked;
}

/**
 * Update a project item's status.
 * @param {string} itemId - Project item ID
 * @param {string} statusKey - Key from PROJECT.statusOptions (e.g. 'drafting', 'published')
 */
export function updateCardStatus(itemId, statusKey) {
  const optionId = PROJECT.statusOptions[statusKey];
  if (!optionId) throw new Error(`Unknown status: ${statusKey}`);
  const raw = execSync(
    `gh api graphql -f query='mutation { updateProjectV2ItemFieldValue(input: { projectId: "${PROJECT.id}", itemId: "${itemId}", fieldId: "${PROJECT.fields.status}", value: { singleSelectOptionId: "${optionId}" } }) { projectV2Item { id } } }'`,
    { encoding: 'utf-8', timeout: 15000 }
  );
  const parsed = JSON.parse(raw);
  if (parsed.errors?.length) {
    throw new Error(`GraphQL error updating status: ${parsed.errors.map(e => e.message).join('; ')}`);
  }
}

/**
 * Set the Article Path field on a project item.
 * @param {string} itemId - Project item ID
 * @param {string} articlePath - Relative path to the article file (e.g. blog/src/content/blog/my-article.md)
 */
export function setArticlePath(itemId, articlePath) {
  const raw = execSync(
    'gh api graphql --input -',
    {
      encoding: 'utf-8',
      timeout: 15000,
      input: JSON.stringify({
        query: `mutation($text: String!) { updateProjectV2ItemFieldValue(input: { projectId: "${PROJECT.id}", itemId: "${itemId}", fieldId: "${PROJECT.fields.articlePath}", value: { text: $text } }) { projectV2Item { id } } }`,
        variables: { text: articlePath },
      }),
    }
  );
  const parsed = JSON.parse(raw);
  if (parsed.errors?.length) {
    throw new Error(`GraphQL error setting article path: ${parsed.errors.map(e => e.message).join('; ')}`);
  }
}

/**
 * Find an existing draft card by title.
 * @param {string} title
 * @param {Array} items - Pre-fetched project items
 * @returns {object | null}
 */
function findExistingCard(title, items) {
  return items.find(i => i.title === title) || null;
}

/**
 * Create or update a draft card for a topic cluster.
 * @param {{cluster: string, label: string, score: number, items: Array, contentType: string, counts: object}} topic
 * @param {boolean} dryRun
 * @param {Array} existingItems - Pre-fetched project items for dedup
 */
export async function createProjectCard(topic, dryRun = false, existingItems = null) {
  const title = `[Trend] ${topic.label}`;
  const body = buildCardBody(topic);

  // Check for existing card
  if (existingItems === null) {
    existingItems = getProjectItems();
  }
  const existing = findExistingCard(title, existingItems);

  if (existing) {
    if (dryRun) {
      console.log(`  [DRY RUN] Would update: "${title}" — score → ${topic.score}`);
      return;
    }

    try {
      // Update the draft item body and fields
      execSync(
        'gh api graphql --input -',
        {
          encoding: 'utf-8',
          timeout: 15000,
          input: JSON.stringify({
            query: 'mutation($draftIssueId: ID!, $title: String!, $body: String!) { updateProjectV2DraftIssue(input: { draftIssueId: $draftIssueId, title: $title, body: $body }) { draftIssue { id } } }',
            variables: { draftIssueId: existing.id, title, body },
          }),
        }
      );
      setProjectFields(existing.id, topic, { includeStatus: false });
      console.log(`  Updated: "${title}" — score → ${topic.score}`);
    } catch (err) {
      // updateProjectV2DraftIssue needs the draftIssue ID, not the item ID
      // If update fails, just update the fields
      try {
        setProjectFields(existing.id, topic, { includeStatus: false });
        console.log(`  Updated fields: "${title}" — score → ${topic.score}`);
      } catch (err2) {
        console.error(`  Error updating "${topic.label}": ${err2.message}`);
      }
    }
    return;
  }

  // New topic — create draft card
  if (dryRun) {
    console.log(`  [DRY RUN] Would create: "${title}" — score ${topic.score}`);
    console.log(`  Sources: ${topic.items.length} items`);
    return;
  }

  try {
    const result = execSync(
      'gh api graphql --input -',
      {
        encoding: 'utf-8',
        timeout: 15000,
        input: JSON.stringify({
          query: 'mutation($projectId: ID!, $title: String!, $body: String!) { addProjectV2DraftIssue(input: { projectId: $projectId, title: $title, body: $body }) { projectItem { id } } }',
          variables: { projectId: PROJECT.id, title, body },
        }),
      }
    );
    const parsed = JSON.parse(result);
    if (parsed.errors?.length) {
      throw new Error(`GraphQL error: ${parsed.errors.map(e => e.message).join('; ')}`);
    }
    const itemId = parsed.data.addProjectV2DraftIssue.projectItem.id;

    setProjectFields(itemId, topic);
    console.log(`  Created: "${title}" (score: ${topic.score})`);
  } catch (err) {
    console.error(`  Error creating card for "${topic.label}": ${err.message}`);
  }
}
