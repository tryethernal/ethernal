#!/usr/bin/env node
/**
 * @fileoverview Pushes LISTICLE_TOPICS from config.js to the project board as
 * Detected cards with contentType=comparison-listicle. Idempotent: skips topics
 * whose title already exists on the board (in any status).
 *
 * Usage: node blog/pipeline/seed-listicles.js [--dry-run]
 */

import { execSync } from 'child_process';
import { LISTICLE_TOPICS, PROJECT } from './config.js';
import { getProjectItems } from './project.js';

const dryRun = process.argv.includes('--dry-run');

function createDraftCard(title, body) {
  const escapedBody = body.replace(/'/g, "'\\''");
  const escapedTitle = title.replace(/'/g, "'\\''");
  const result = execSync(
    `gh api graphql -f query='mutation { addProjectV2DraftIssue(input: { projectId: "${PROJECT.id}", title: "${escapedTitle}", body: "${escapedBody}" }) { projectItem { id } } }'`,
    { encoding: 'utf-8', timeout: 15000 }
  );
  const parsed = JSON.parse(result);
  if (parsed.errors?.length) throw new Error(parsed.errors.map(e => e.message).join('; '));
  return parsed.data.addProjectV2DraftIssue.projectItem.id;
}

function setField(itemId, fieldId, value) {
  execSync(
    `gh api graphql -f query='mutation { updateProjectV2ItemFieldValue(input: { projectId: "${PROJECT.id}", itemId: "${itemId}", fieldId: "${fieldId}", value: { ${value} } }) { projectV2Item { id } } }'`,
    { encoding: 'utf-8', timeout: 15000 }
  );
}

async function main() {
  console.log(`Seed listicles — ${dryRun ? 'DRY RUN' : 'live'}\n`);
  const existing = getProjectItems();
  const existingTitles = new Set(existing.map(i => i.title));

  for (const topic of LISTICLE_TOPICS) {
    if (existingTitles.has(topic.title)) {
      console.log(`  skip (exists): ${topic.title}`);
      continue;
    }
    if (dryRun) {
      console.log(`  [DRY RUN] would create: ${topic.title}  (cluster=${topic.cluster}, score=${topic.score})`);
      continue;
    }
    const itemId = createDraftCard(topic.title, topic.body);
    setField(itemId, PROJECT.fields.trendScore, `number: ${topic.score}`);
    setField(itemId, PROJECT.fields.status, `singleSelectOptionId: "${PROJECT.statusOptions.detected}"`);
    setField(itemId, PROJECT.fields.contentType, `singleSelectOptionId: "${PROJECT.contentTypeOptions['comparison-listicle']}"`);
    const clusterOptionId = PROJECT.clusterOptions[topic.cluster];
    if (clusterOptionId) setField(itemId, PROJECT.fields.topicCluster, `singleSelectOptionId: "${clusterOptionId}"`);
    console.log(`  created: ${topic.title}  (id=${itemId})`);
  }
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
