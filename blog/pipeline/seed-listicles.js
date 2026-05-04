#!/usr/bin/env node
/**
 * @fileoverview Pushes LISTICLE_TOPICS from config.js to the project board as
 * Detected cards with contentType=comparison-listicle. Idempotent: skips topics
 * whose title already exists on the board (in any status).
 *
 * Usage: node blog/pipeline/seed-listicles.js [--dry-run]
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { LISTICLE_TOPICS, PROJECT } from './config.js';
import { getProjectItems } from './project.js';

const dryRun = process.argv.includes('--dry-run');

/**
 * Run a GraphQL mutation with variables passed via a JSON file (-F query=@file)
 * to avoid shell-quoting issues with arbitrary user content (double quotes,
 * backticks, newlines).
 */
function runGraphQL(query, variables = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'gh-gql-'));
  const queryFile = join(dir, 'q.graphql');
  writeFileSync(queryFile, query);
  try {
    const args = [`gh api graphql --raw-field query=@${queryFile}`];
    for (const [k, v] of Object.entries(variables)) {
      const tmpFile = join(dir, `v_${k}.txt`);
      writeFileSync(tmpFile, typeof v === 'string' ? v : JSON.stringify(v));
      args.push(`-F ${k}=@${tmpFile}`);
    }
    const raw = execSync(args.join(' '), { encoding: 'utf-8', timeout: 15000 });
    const parsed = JSON.parse(raw);
    if (parsed.errors?.length) throw new Error(parsed.errors.map(e => e.message).join('; '));
    return parsed.data;
  } finally {
    try { unlinkSync(queryFile); } catch {}
  }
}

function createDraftCard(title, body) {
  const data = runGraphQL(
    'mutation($projectId: ID!, $title: String!, $body: String!) { addProjectV2DraftIssue(input: { projectId: $projectId, title: $title, body: $body }) { projectItem { id } } }',
    { projectId: PROJECT.id, title, body }
  );
  return data.addProjectV2DraftIssue.projectItem.id;
}

/**
 * Set a singleSelect or number field. `valueLiteral` is a GraphQL value-object
 * fragment string (e.g. `singleSelectOptionId: "abc"` or `number: 9`). Caller
 * controls only literal IDs/numbers we set ourselves — never user content —
 * so direct interpolation is safe here.
 */
function setField(itemId, fieldId, valueLiteral) {
  runGraphQL(
    `mutation { updateProjectV2ItemFieldValue(input: { projectId: "${PROJECT.id}", itemId: "${itemId}", fieldId: "${fieldId}", value: { ${valueLiteral} } }) { projectV2Item { id } } }`
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
