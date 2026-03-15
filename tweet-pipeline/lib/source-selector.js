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
    { title: 'Custom branding on your explorer', description: 'Add your logo, colors, and domain to make the explorer match your chain\'s identity.' },
    { title: 'One-click contract verification', description: 'Verify contracts instantly by uploading source code or using Hardhat/Foundry plugins.' },
    { title: 'Transaction decoding', description: 'Ethernal automatically decodes transaction inputs and logs using uploaded or verified ABIs.' },
    { title: 'DEX pair tracking', description: 'Track liquidity pools, swaps, and price charts for DEX pairs deployed on your chain.' },
    { title: 'Token balance history', description: 'View historical token balances for any address, with charts showing changes over time.' },
    { title: 'Real-time sync with WebSocket', description: 'Get instant updates on new blocks, transactions, and events via WebSocket subscriptions.' },
    { title: 'Multi-chain workspace', description: 'Manage multiple chains from a single dashboard. Switch between networks in one click.' },
    { title: 'API access for your explorer', description: 'Full REST API with Etherscan-compatible endpoints for programmatic access to chain data.' },
    { title: 'Hardhat/Foundry integration', description: 'Auto-sync contracts and transactions during local development with our Hardhat and Foundry plugins.' },
    { title: 'Historical data sync', description: 'Import historical blocks, transactions, and logs from any point in chain history.' },
    { title: 'Gas usage analytics', description: 'Visualize gas consumption trends, top gas consumers, and optimize contract deployments.' },
    { title: 'Hosted or self-hosted', description: 'Use our managed cloud service or deploy the open-source explorer on your own infrastructure.' },
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

        const result = execSync(`gh api graphql -f query='${query.replace(/'/g, "'\\''")}'`, {
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
    } catch {
        // gh CLI not available or project not found, return empty
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

        for (const file of files) {
            const content = readFileSync(join(BLOG_DIR, file), 'utf-8');
            const parsed = parseArticleFrontmatter(content, file);
            if (parsed) articles.push(parsed);
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
