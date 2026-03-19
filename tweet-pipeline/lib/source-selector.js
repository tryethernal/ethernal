/**
 * @fileoverview Source selector for the tweet pipeline.
 * Picks content from one of three sources: trend scanner (GitHub Projects),
 * blog articles (Astro frontmatter), or static feature tips.
 */

import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const BLOG_DIR = join(REPO_ROOT, 'blog', 'src', 'content', 'blog');

/**
 * Static list of Ethernal product feature tips for the "Product tip" bucket.
 * @type {Array<{title: string, description: string}>}
 */
export const FEATURE_TIPS = [
    { title: 'Custom branding whitelabel explorer', description: 'Add your logo, colors, and domain to make the explorer match your chain\'s identity.' },
    { title: 'One-click contract verification Solidity Vyper', description: 'Verify contracts instantly by uploading source code or using Hardhat/Foundry plugins.' },
    { title: 'Transaction decoding ABI calldata events', description: 'Ethernal automatically decodes transaction inputs and logs using uploaded or verified ABIs.' },
    { title: 'DEX pair tracking liquidity pools swaps', description: 'Track liquidity pools, swaps, and price charts for DEX pairs deployed on your chain.' },
    { title: 'Token balance history ERC-20 NFT portfolio', description: 'View historical token balances for any address, with charts showing changes over time.' },
    { title: 'Real-time sync WebSocket eth_subscribe blocks', description: 'Get instant updates on new blocks, transactions, and events via WebSocket subscriptions.' },
    { title: 'Multi-chain workspace L2 rollup dashboard', description: 'Manage multiple chains from a single dashboard. Switch between networks in one click.' },
    { title: 'Etherscan-compatible REST API rate-limit-free', description: 'Full REST API with Etherscan-compatible endpoints for programmatic access to chain data.' },
    { title: 'Hardhat Foundry Anvil integration local dev', description: 'Auto-sync contracts and transactions during local development with our Hardhat and Foundry plugins.' },
    { title: 'Historical data sync import backfill blocks', description: 'Import historical blocks, transactions, and logs from any point in chain history.' },
    { title: 'Gas usage analytics cost optimization EVM', description: 'Visualize gas consumption trends, top gas consumers, and optimize contract deployments.' },
    { title: 'Hosted self-hosted open-source explorer deploy', description: 'Use our managed cloud service or deploy the open-source explorer on your own infrastructure.' },
];

/**
 * Parses YAML frontmatter from an Astro/Markdown blog article.
 * Only returns articles with status "published".
 * @param {string} content - The full file content including frontmatter.
 * @param {string} filename - The filename (used to derive the slug).
 * @returns {{title: string, description: string, slug: string, date: Date, status: string, tags: string[]}|null}
 *   Parsed frontmatter object, or null if not published or malformed.
 */
export function parseArticleFrontmatter(content, filename) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    const yaml = match[1];
    const fields = {};

    // Parse simple YAML fields
    const lines = yaml.split('\n');
    let currentKey = null;
    let inArray = false;

    for (const line of lines) {
        const keyMatch = line.match(/^(\w+):\s*(.*)/);
        if (keyMatch) {
            const [, key, value] = keyMatch;
            if (value.trim() === '') {
                // Could be start of an array or empty value
                currentKey = key;
                inArray = false;
            } else {
                fields[key] = value.replace(/^["']|["']$/g, '').trim();
                currentKey = key;
                inArray = false;
            }
        } else if (line.match(/^\s+-\s+(.+)/)) {
            // Array item
            const itemMatch = line.match(/^\s+-\s+(.+)/);
            if (currentKey && itemMatch) {
                if (!Array.isArray(fields[currentKey])) {
                    fields[currentKey] = [];
                }
                fields[currentKey].push(itemMatch[1].replace(/^["']|["']$/g, '').trim());
            }
        }
    }

    if (fields.status !== 'published') return null;

    const slug = filename.replace(/\.md$/, '');

    return {
        title: fields.title || '',
        description: fields.description || '',
        slug,
        date: fields.date ? new Date(fields.date) : new Date(),
        status: fields.status,
        tags: Array.isArray(fields.tags) ? fields.tags : [],
    };
}

/**
 * Common English stop words to exclude from keyword extraction.
 * @type {Set<string>}
 */
const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'can', 'shall', 'not', 'no', 'nor',
    'so', 'if', 'then', 'than', 'that', 'this', 'these', 'those', 'it',
    'its', 'how', 'what', 'when', 'where', 'who', 'which', 'why', 'all',
    'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
    'into', 'over', 'after', 'before', 'between', 'out', 'up', 'down',
    'about', 'just', 'also', 'now', 'here', 'there', 'one', 'two', 'three',
    'new', 'your', 'you', 'they', 'them', 'their', 'our', 'we', 'my',
    'his', 'her', 'get', 'got', 'per', 'via', 'yet', 'still',
]);

/**
 * Basic suffix-stripping stemmer to normalize word forms.
 * Maps plural/past-tense/gerund forms to a common root for better matching
 * (e.g., "failures" -> "failur", "swapped" -> "swap", "routing" -> "rout").
 * @param {string} word - Lowercase word to stem.
 * @returns {string} Stemmed word.
 */
function stem(word) {
    if (word.length < 4) return word;
    return word
        .replace(/ies$/, 'y')
        .replace(/ied$/, 'y')
        .replace(/ing$/, '')
        .replace(/ment$/, '')
        .replace(/ness$/, '')
        .replace(/tion$/, '')
        .replace(/sion$/, '')
        .replace(/ures?$/, 'ur')
        .replace(/ous$/, '')
        .replace(/ive$/, '')
        .replace(/ble$/, '')
        .replace(/ally$/, '')
        .replace(/ated$/, 'ate')
        .replace(/pped$/, 'p')
        .replace(/tted$/, 't')
        .replace(/nned$/, 'n')
        .replace(/ed$/, '')
        .replace(/es$/, '')
        .replace(/s$/, '');
}

/**
 * Extracts significant keywords from text for semantic comparison.
 * Handles both natural text ("$50M DeFi routing failure") and slug format ("50m-defi-routing-failure").
 * Preserves numbers with units (e.g., "$50.4M" -> "50.4m", "$36,000" -> "36,000").
 * @param {string} text - The text to extract keywords from.
 * @returns {Set<string>} Set of lowercase keywords (3+ chars, stop words removed).
 */
export function extractKeywords(text) {
    if (!text) return new Set();

    // Replace hyphens with spaces (handles slug format)
    const normalized = text.replace(/-/g, ' ');

    // Extract dollar amounts as special tokens (e.g., "$50.4M" -> "50.4m" and "50m")
    const amounts = [];
    for (const m of normalized.matchAll(/\$([0-9][0-9,.]*[a-zA-Z]?)/g)) {
        const raw = m[1].toLowerCase();
        amounts.push(raw);
        // Also add rounded version without decimals (e.g., "50.4m" -> "50m")
        const rounded = raw.replace(/[.,]\d+([a-z]?)$/, '$1');
        if (rounded !== raw && rounded.length >= 3) amounts.push(rounded);
    }

    // Extract regular words (3+ chars, alphanumeric), strip trailing punctuation
    const words = normalized
        .toLowerCase()
        .replace(/[^a-z0-9\s,.]/g, ' ')
        .split(/\s+/)
        .map(w => w.replace(/[.,]+$/, ''))
        .filter(w => w.length >= 3 && !STOP_WORDS.has(w));

    // Apply stemming for better cross-text matching
    const stemmed = words.map(w => stem(w)).filter(w => w.length >= 3);

    return new Set([...stemmed, ...amounts]);
}

/**
 * Checks if a candidate topic is semantically similar to any existing content.
 * Computes keyword overlap ratio bidirectionally: if >20% of either set's keywords
 * overlap with the other, it's considered a duplicate.
 * Requires at least 2 overlapping stemmed keywords to avoid false positives on short texts.
 * @param {string} candidateTitle - The candidate source title to check.
 * @param {string[]} recentHooks - Hook text from recent tweets (last 30 days).
 * @param {string[]} blogTitles - Titles of published blog articles (last 60 days).
 * @param {string[]} promotedSlugs - Slugs from .promoted-articles file.
 * @returns {boolean} True if the candidate is a semantic duplicate.
 */
export function isSemanticallyDuplicate(candidateTitle, recentHooks, blogTitles, promotedSlugs) {
    const candidateKeys = extractKeywords(candidateTitle);
    if (candidateKeys.size < 3) return false;

    const allReferences = [
        ...recentHooks,
        ...blogTitles,
        ...promotedSlugs,
    ];

    for (const ref of allReferences) {
        const refKeys = extractKeywords(ref);
        if (refKeys.size === 0) continue;

        let overlap = 0;
        for (const key of candidateKeys) {
            if (refKeys.has(key)) overlap++;
        }

        // Check overlap ratio against both sets — a match in either direction indicates similarity.
        // Uses the higher ratio to catch cases where one text is much longer than the other.
        const candidateRatio = overlap / candidateKeys.size;
        const refRatio = overlap / refKeys.size;
        const ratio = Math.max(candidateRatio, refRatio);
        if (overlap >= 2 && ratio > 0.2) return true;
    }

    return false;
}

/**
 * Returns titles of published blog articles from the last N days.
 * Used by the dedup check in draft.sh to cross-reference against blog content.
 * @param {number} [days=60] - How many days back to look.
 * @returns {string[]} Array of article titles.
 */
export function fetchPublishedBlogTitles(days = 60) {
    try {
        const files = readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const titles = [];

        for (const file of files) {
            const content = readFileSync(join(BLOG_DIR, file), 'utf-8');
            const parsed = parseArticleFrontmatter(content, file);
            if (!parsed) continue;
            if (parsed.date < cutoff) continue;
            titles.push(parsed.title);
        }

        return titles;
    } catch {
        return [];
    }
}

/**
 * Fetches trend items from the GitHub Projects board via the gh CLI.
 * Queries org "tryethernal", project number 1, filtering for actionable statuses.
 * @returns {Array<{title: string, description: string, id: string, status: string}>}
 */
function fetchTrendItems() {
    try {
        const query = `query {
            organization(login: "tryethernal") {
                projectV2(number: 1) {
                    items(first: 50) {
                        nodes {
                            id
                            fieldValueByName(name: "Status") {
                                ... on ProjectV2ItemFieldSingleSelectValue { name }
                            }
                            content {
                                ... on DraftIssue { title body }
                                ... on Issue { title body }
                            }
                        }
                    }
                }
            }
        }`;

        const result = execSync('gh api graphql --input -', {
            input: JSON.stringify({ query }),
            encoding: 'utf-8',
            timeout: 10000,
        });

        const data = JSON.parse(result);
        const items = data?.data?.organization?.projectV2?.items?.nodes || [];
        const validStatuses = ['detected', 'drafting', 'published'];

        return items
            .filter(item => {
                const status = item.fieldValueByName?.name?.toLowerCase();
                return status && validStatuses.includes(status);
            })
            .map(item => ({
                title: item.content?.title || 'Untitled',
                description: item.content?.body || '',
                id: item.id,
                status: item.fieldValueByName?.name?.toLowerCase(),
            }));
    } catch (err) {
        console.error('fetchTrendItems failed:', err.message || err);
        return [];
    }
}

/**
 * Reads published blog articles from the content directory.
 * @returns {Array<{title: string, description: string, slug: string, date: Date, tags: string[]}>}
 */
function fetchBlogArticles() {
    try {
        const files = readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
        const articles = [];
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

        for (const file of files) {
            const content = readFileSync(join(BLOG_DIR, file), 'utf-8');
            const parsed = parseArticleFrontmatter(content, file);
            if (!parsed) continue;
            // Skip articles published in last 48h (promo tweet covers them)
            if (parsed.date > cutoff) continue;
            articles.push(parsed);
        }

        return articles;
    } catch {
        return [];
    }
}

/**
 * Picks a random item from candidates, excluding items whose title is in recentIds.
 * Falls back to the full candidates list if all are recent (reset behavior).
 * @param {Array<{title: string}>} candidates - Available items.
 * @param {string[]} recentIds - Titles of recently used items to skip.
 * @returns {{title: string}|null} Selected item or null if candidates is empty.
 */
function pickRandom(candidates, recentIds) {
    if (candidates.length === 0) return null;

    const available = candidates.filter(c => !recentIds.includes(c.title));
    const pool = available.length > 0 ? available : candidates;
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Selects a content source for a tweet based on the source type.
 * Picks a random item from the source, skipping recently used items.
 * Falls back to feature tips if the primary source yields no candidates.
 * @param {'trend_scanner'|'blog'|'features'} sourceType - Which source to query.
 * @param {string[]} recentIds - Titles of recently used items to skip.
 * @returns {{title: string, description: string, [key: string]: any}} Selected source item.
 */
export function selectSource(sourceType, recentIds) {
    let candidates = [];

    switch (sourceType) {
        case 'trend_scanner':
            candidates = fetchTrendItems();
            break;
        case 'blog':
            candidates = fetchBlogArticles();
            break;
        case 'features':
            candidates = FEATURE_TIPS;
            break;
        default:
            candidates = FEATURE_TIPS;
    }

    const selected = pickRandom(candidates, recentIds);
    if (selected) return selected;

    // Fall back to feature tips
    return pickRandom(FEATURE_TIPS, recentIds) || FEATURE_TIPS[0];
}
