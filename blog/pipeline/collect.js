/**
 * @fileoverview Collectors for all trend sources.
 * Each collector returns an array of { title, url, source, date, abstract? }.
 */

import { execSync } from 'child_process';
import Parser from 'rss-parser';
import { FEEDS, ARXIV_QUERY, LOOKBACK_DAYS } from './config.js';

const parser = new Parser();
const cutoffDate = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

/** Filter out low-value PRs (typo fixes, status updates, minor edits) */
const NOISE_PATTERNS = [
  /fix(es)?\s*typo/i,
  /stagnant/i,
  /update\s+eip-\d+.*:\s*(fix|typo|minor|nit|format)/i,
  /update\s+erc-\d+.*:\s*(fix|typo|minor|nit|format)/i,
  /move to/i,
  /mark as/i,
];

/**
 * Fetch new proposals from a GitHub repo (EIPs or ERCs).
 * @param {string} repo - GitHub repo path (e.g. 'ethereum/EIPs')
 * @param {string} source - Source tag ('eip' or 'erc')
 * @returns {Array<{title: string, url: string, source: string, date: string, abstract: string}>}
 */
function collectProposals(repo, source) {
  const since = cutoffDate.toISOString();
  const result = execSync(
    `gh api "repos/${repo}/pulls?state=all&sort=created&direction=desc&per_page=50" --jq '[.[] | select(.created_at >= "${since}") | {title: .title, url: .html_url, date: .created_at, body: (.body // "" | .[0:500])}]'`,
    { encoding: 'utf-8', timeout: 30000 }
  );

  const items = JSON.parse(result);
  if (items.length === 50) {
    console.warn(`  Warning: hit per_page=50 cap for ${repo} — results may be truncated`);
  }
  return items
    .map(item => ({ title: item.title, url: item.url, source, date: item.date, abstract: item.body }))
    .filter(item => {
      const t = item.title.toLowerCase();
      // Keep PRs that reference EIP/ERC numbers or add new proposals; drop noise
      if (!t.includes(source) && !t.includes(`${source}-`)) return false;
      return !NOISE_PATTERNS.some(p => p.test(item.title));
    });
}

/** @returns {Promise<Array>} */
export async function collectEIPs() { return collectProposals('ethereum/EIPs', 'eip'); }

/** @returns {Promise<Array>} */
export async function collectERCs() { return collectProposals('ethereum/ERCs', 'erc'); }

/**
 * Fetch recent posts from ethresear.ch RSS.
 * @returns {Promise<Array<{title: string, url: string, source: string, date: string, abstract: string}>>}
 */
export async function collectEthResearch() {
  try {
    const feed = await parser.parseURL(FEEDS.ethresearch);
    return feed.items
      .filter(item => new Date(item.pubDate) >= cutoffDate)
      .map(item => ({
        title: item.title,
        url: item.link,
        source: 'ethresearch',
        date: item.pubDate,
        abstract: (item.contentSnippet || '').slice(0, 500),
      }));
  } catch (err) {
    console.warn('Failed to fetch ethresear.ch RSS:', err.message);
    return [];
  }
}

/**
 * Fetch recent topics from Ethereum Magicians RSS.
 * @returns {Promise<Array<{title: string, url: string, source: string, date: string, abstract: string}>>}
 */
export async function collectMagicians() {
  try {
    const feed = await parser.parseURL(FEEDS.magicians);
    return feed.items
      .filter(item => new Date(item.pubDate) >= cutoffDate)
      .map(item => ({
        title: item.title,
        url: item.link,
        source: 'magicians',
        date: item.pubDate,
        abstract: (item.contentSnippet || '').slice(0, 500),
      }));
  } catch (err) {
    console.warn('Failed to fetch Ethereum Magicians RSS:', err.message);
    return [];
  }
}

/**
 * Fetch recent blockchain/Ethereum papers from arxiv.
 * @returns {Promise<Array<{title: string, url: string, source: string, date: string, abstract: string}>>}
 */
export async function collectArxiv() {
  try {
    const query = encodeURIComponent(ARXIV_QUERY);
    const url = `https://export.arxiv.org/api/query?search_query=${query}&sortBy=submittedDate&sortOrder=descending&max_results=50`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`arxiv API returned ${res.status} ${res.statusText}`);
    }
    const xml = await res.text();

    const entries = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, ' ').trim();
      const link = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim();
      const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim();
      const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, ' ').trim();

      if (title && new Date(published) >= cutoffDate) {
        entries.push({
          title,
          url: link,
          source: 'arxiv',
          date: published,
          abstract: (summary || '').slice(0, 500),
        });
      }
    }
    return entries;
  } catch (err) {
    console.warn('Failed to fetch arxiv:', err.message);
    return [];
  }
}

/**
 * Fetch Google Trends interest for given keywords.
 * Returns a map of keyword → relative interest (0-100).
 * @param {string[]} keywords
 * @returns {Promise<Record<string, number>>}
 */
export async function collectGoogleTrends(keywords) {
  try {
    const googleTrends = await import('google-trends-api');
    const results = {};

    // Batch in groups of 5 (Google Trends limit)
    for (let i = 0; i < keywords.length; i += 5) {
      const batch = keywords.slice(i, i + 5);
      try {
        const data = await googleTrends.default.interestOverTime({
          keyword: batch,
          startTime: cutoffDate,
          geo: '',
          category: 0,
        });
        const parsed = JSON.parse(data);
        const timeline = parsed.default?.timelineData || [];
        for (let j = 0; j < batch.length; j++) {
          const values = timeline.map(t => t.value[j] || 0);
          results[batch[j]] = values.length > 0
            ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
            : 0;
        }
      } catch {
        batch.forEach(kw => { results[kw] = 0; });
      }
      // Rate limit: wait between batches
      if (i + 5 < keywords.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    return results;
  } catch (err) {
    console.warn('Failed to fetch Google Trends:', err.message);
    return Object.fromEntries(keywords.map(kw => [kw, 0]));
  }
}
