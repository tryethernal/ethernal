/**
 * @fileoverview Classifies collected items into topic clusters and scores them.
 */

import { CLUSTERS, WEIGHTS, SCORE_THRESHOLD, CLUSTER_PERFORMANCE_MULTIPLIER } from './config.js';

/**
 * Classify a single item into the best-matching cluster.
 * @param {{title: string, abstract?: string}} item
 * @returns {string} cluster key, or 'emerging' if no match
 */
function classifyItem(item) {
  const text = `${item.title} ${item.abstract || ''}`.toLowerCase();
  let bestCluster = 'emerging';
  let bestScore = 0;

  for (const [key, { keywords }] of Object.entries(CLUSTERS)) {
    const score = keywords.reduce((acc, kw) => {
      return acc + (text.includes(kw.toLowerCase()) ? 1 : 0);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestCluster = key;
    }
  }

  return bestCluster;
}

/**
 * Suggest the best content type for an item.
 * @param {{source: string, title: string, abstract?: string}} item
 * @returns {string} content type key
 */
function suggestContentType(item) {
  const text = `${item.title} ${item.abstract || ''}`.toLowerCase();
  if (item.source === 'erc') return 'erc-tutorial';
  if (item.source === 'eip') return 'eip-explainer';
  if (item.source === 'arxiv') return 'research-deep-dive';
  if (text.includes('pectra') || text.includes('fusaka') || text.includes('upgrade')) return 'upgrade-guide';
  return 'research-deep-dive';
}

/**
 * Group items by cluster and compute scores.
 * @param {Array} items - All collected items
 * @param {Record<string, number>} trendScores - Google Trends scores by cluster label
 * @returns {Array<{cluster: string, label: string, score: number, items: Array, contentType: string}>}
 */
export function classifyAndScore(items, trendScores = {}) {
  const groups = {};

  for (const item of items) {
    const cluster = classifyItem(item);
    if (!groups[cluster]) {
      groups[cluster] = {
        cluster,
        label: CLUSTERS[cluster]?.label || 'Emerging',
        items: [],
        counts: { eip: 0, erc: 0, ethresearch: 0, arxiv: 0, magicians: 0 },
      };
    }
    groups[cluster].items.push({ ...item, cluster });
    groups[cluster].counts[item.source] = (groups[cluster].counts[item.source] || 0) + 1;
  }

  const scored = Object.values(groups).map(group => {
    const { counts } = group;
    const trendValue = trendScores[group.label] || 0;

    const rawScore =
      (counts.erc || 0) * WEIGHTS.erc_count +
      (counts.eip || 0) * WEIGHTS.eip_count +
      (counts.ethresearch || 0) * WEIGHTS.ethresearch_posts +
      (counts.arxiv || 0) * WEIGHTS.arxiv_papers +
      (counts.magicians || 0) * WEIGHTS.magicians_topics +
      trendValue * WEIGHTS.google_trends;

    const performanceMultiplier = CLUSTER_PERFORMANCE_MULTIPLIER[group.cluster] ?? 1.0;
    const score = Math.round(rawScore * performanceMultiplier);

    // Pick the most common content type
    const typeCounts = {};
    for (const item of group.items) {
      const ct = suggestContentType(item);
      typeCounts[ct] = (typeCounts[ct] || 0) + 1;
    }
    const contentType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'research-deep-dive';

    return { ...group, score, contentType };
  });

  return scored
    .filter(g => g.score >= SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score);
}
