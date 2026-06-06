#!/usr/bin/env node
/**
 * @fileoverview Blog trend pipeline orchestrator.
 * Collects from all sources, classifies into topic clusters, scores, and
 * creates GitHub Project cards for high-scoring topics.
 *
 * Usage:
 *   node index.js           # Full run: collect, score, create cards
 *   node index.js --dry-run # Collect and score, but don't create cards
 */

import {
  collectEIPs,
  collectERCs,
  collectEthResearch,
  collectMagicians,
  collectArxiv,
  collectGoogleTrends,
} from './collect.js';
import { classifyAndScore } from './classify.js';
import { enrichCandidates } from './enrich-keywords.mjs';
import { createProjectCard, pickNextTopic, getProjectItems } from './project.js';
import { CLUSTERS } from './config.js';

const dryRun = process.argv.includes('--dry-run');
const pickMode = process.argv.includes('--pick');

async function main() {
  console.log(`Blog Trend Pipeline — ${new Date().toISOString()}`);

  // --pick mode: just pick the next topic for drafting (every-2-day cadence)
  if (pickMode) {
    console.log(dryRun ? '(DRY RUN — pick mode)\n' : '(Pick mode)\n');
    const picked = pickNextTopic(dryRun);
    if (picked) {
      // Output the picked topic as JSON for downstream consumption
      console.log(`\n::picked::${JSON.stringify(picked)}`);
    }
    return;
  }

  console.log(dryRun ? '(DRY RUN — no cards will be created)\n' : '\n');

  // 1. Collect from all sources in parallel
  console.log('Collecting from sources...');
  const [eips, ercs, ethresearch, magicians, arxiv] = await Promise.all([
    collectEIPs().catch(err => { console.warn('EIPs failed:', err.message); return []; }),
    collectERCs().catch(err => { console.warn('ERCs failed:', err.message); return []; }),
    collectEthResearch(),
    collectMagicians(),
    collectArxiv(),
  ]);

  console.log(`  EIPs: ${eips.length}`);
  console.log(`  ERCs: ${ercs.length}`);
  console.log(`  ethresear.ch: ${ethresearch.length}`);
  console.log(`  Ethereum Magicians: ${magicians.length}`);
  console.log(`  arxiv: ${arxiv.length}`);

  const allItems = [...eips, ...ercs, ...ethresearch, ...magicians, ...arxiv];
  console.log(`  Total: ${allItems.length} items\n`);

  if (allItems.length === 0) {
    console.log('No items collected. Exiting.');
    return;
  }

  // 2. Fetch Google Trends for cluster labels
  console.log('Fetching Google Trends...');
  const clusterLabels = Object.values(CLUSTERS).map(c => c.label);
  const trendScores = await collectGoogleTrends(clusterLabels);
  for (const [label, score] of Object.entries(trendScores)) {
    if (score > 0) console.log(`  ${label}: ${score}`);
  }
  console.log('');

  // 3. Classify and score
  console.log('Classifying and scoring...');
  const scoredTopics = classifyAndScore(allItems, trendScores);

  // 3.5. Enrich with DataForSEO keyword volume (best-effort, never fatal).
  // Adds finalScore (score + boost capped at 30% of score), primaryKeyword,
  // and keywordsEnriched[]. Graceful no-op when DATAFORSEO_LOGIN/PASSWORD are
  // unset: every topic comes back with finalScore === score, so the pipeline
  // produces the same cards it would have without enrichment.
  console.log('Enriching with keyword volume (DataForSEO)...');
  let topics;
  try {
    topics = await enrichCandidates(scoredTopics);
    // Re-sort by finalScore (falls back to score for unenriched topics).
    topics.sort((a, b) => (b.finalScore ?? b.score ?? 0) - (a.finalScore ?? a.score ?? 0));
    const enrichedCount = topics.filter(t => t.keywordsEnriched?.length > 0).length;
    console.log(`  ${enrichedCount}/${topics.length} topics enriched with keywords`);
  } catch (err) {
    // enrichCandidates is best-effort and shouldn't throw, but never let
    // enrichment break the run — fall back to the un-enriched scored topics.
    console.warn(`  Enrichment failed (${err.message}); proceeding with editorial scores only`);
    topics = scoredTopics;
  }

  console.log(`\nTop topics (${topics.length} above threshold):`);
  console.log('─'.repeat(70));
  for (const topic of topics) {
    const score = topic.finalScore ?? topic.score;
    const kw = topic.primaryKeyword ? ` │ kw: ${topic.primaryKeyword}` : '';
    console.log(`  ${String(score).padStart(4)} │ ${topic.label.padEnd(25)} │ ${topic.contentType.padEnd(18)} │ ${topic.items.length} items${kw}`);
  }
  console.log('─'.repeat(70));
  console.log('');

  // 4. Create/update project cards
  console.log('Creating project cards...');
  const existingItems = getProjectItems();
  for (const topic of topics) {
    await createProjectCard(topic, dryRun, existingItems);
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
