#!/usr/bin/env bash
# Weekly audit summary — reads audit.jsonl and produces a plain-text report
# Also prunes entries older than 90 days
set -euo pipefail

AUDIT_LOG="/var/log/tweet-pipeline/audit.jsonl"
SUMMARY_FILE="/var/log/tweet-pipeline/audit-weekly-summary.txt"

if [ ! -f "$AUDIT_LOG" ]; then
  echo "No audit log found at $AUDIT_LOG — nothing to summarize."
  exit 0
fi

# Prune entries older than 90 days
CUTOFF=$(date -u -d '90 days ago' +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -v-90d +%Y-%m-%dT%H:%M:%S)
BEFORE_COUNT=$(wc -l < "$AUDIT_LOG")
jq -c --arg cutoff "$CUTOFF" 'select(.timestamp > $cutoff)' "$AUDIT_LOG" > "${AUDIT_LOG}.tmp" \
  && mv "${AUDIT_LOG}.tmp" "$AUDIT_LOG"
AFTER_COUNT=$(wc -l < "$AUDIT_LOG")
PRUNED=$((BEFORE_COUNT - AFTER_COUNT))

# Generate summary
node -e "
const fs = require('fs');
const lines = fs.readFileSync('$AUDIT_LOG', 'utf8').trim().split('\n').filter(Boolean);
if (lines.length === 0) {
  console.log('No audit entries in the last 90 days.');
  process.exit(0);
}

const entries = lines.map(l => JSON.parse(l));

// Last 7 days only for the weekly report
const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const recent = entries.filter(e => e.timestamp > weekAgo);

if (recent.length === 0) {
  console.log('No audit entries in the last 7 days.');
  process.exit(0);
}

const total = recent.length;
const edited = recent.filter(e => e.edited).length;
const discarded = recent.filter(e => e.discarded).length;
const clean = total - edited - discarded;

console.log('=== Tweet Audit Weekly Summary ===');
console.log('Period: last 7 days');
console.log('Generated: ' + new Date().toISOString());
console.log('');
console.log('--- Overview ---');
console.log('Tweets audited:  ' + total);
console.log('  Clean (no edits): ' + clean + ' (' + Math.round(clean/total*100) + '%)');
console.log('  Edited:           ' + edited + ' (' + Math.round(edited/total*100) + '%)');
console.log('  Discarded:        ' + discarded + ' (' + Math.round(discarded/total*100) + '%)');
console.log('');

// Claim-level stats
const allClaims = recent.flatMap(e => e.claims || []);
const verdicts = {};
const actions = {};
allClaims.forEach(c => {
  verdicts[c.verdict] = (verdicts[c.verdict] || 0) + 1;
  actions[c.action] = (actions[c.action] || 0) + 1;
});

console.log('--- Claims ---');
console.log('Total claims checked: ' + allClaims.length);
Object.entries(verdicts).sort((a,b) => b[1]-a[1]).forEach(([v, n]) => {
  console.log('  ' + v + ': ' + n + ' (' + Math.round(n/allClaims.length*100) + '%)');
});
console.log('');
console.log('Actions taken:');
Object.entries(actions).sort((a,b) => b[1]-a[1]).forEach(([a, n]) => {
  console.log('  ' + a + ': ' + n);
});
console.log('');

// Top confirming sources
const sources = allClaims.filter(c => c.verdict === 'confirmed' && c.source).map(c => {
  try { return new URL(c.source).hostname; } catch { return c.source; }
});
const sourceCounts = {};
sources.forEach(s => sourceCounts[s] = (sourceCounts[s] || 0) + 1);
const topSources = Object.entries(sourceCounts).sort((a,b) => b[1]-a[1]).slice(0, 5);
if (topSources.length > 0) {
  console.log('--- Top Confirming Sources ---');
  topSources.forEach(([s, n]) => console.log('  ' + s + ': ' + n + ' confirmations'));
  console.log('');
}

// Unconfirmed claims detail
const unconfirmed = recent.filter(e => (e.claims || []).some(c => c.verdict === 'unconfirmed' || c.verdict === 'false'));
if (unconfirmed.length > 0) {
  console.log('--- Unverified Claims (detail) ---');
  unconfirmed.forEach(e => {
    const bad = e.claims.filter(c => c.verdict === 'unconfirmed' || c.verdict === 'false');
    bad.forEach(c => {
      console.log('  [' + c.verdict.toUpperCase() + '] \"' + c.text + '\" (action: ' + c.action + ')');
    });
  });
  console.log('');
}

console.log('Log pruned: ' + $PRUNED + ' entries older than 90 days removed.');
" > "$SUMMARY_FILE"

echo "Summary written to $SUMMARY_FILE"
cat "$SUMMARY_FILE"
