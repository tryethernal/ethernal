import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { parseArticleFrontmatter, FEATURE_TIPS, selectSource, extractKeywords } from './source-selector.js';

describe('source-selector', () => {
    describe('parseArticleFrontmatter', () => {
        it('parses published article frontmatter', () => {
            const content = `---
title: "Test Article"
description: "A test article description."
image: "/blog/images/test.png"
tags:
  - EVM
  - Ethereum
date: 2026-03-12
status: published
readingTime: 5
---

Article body here.`;

            const result = parseArticleFrontmatter(content, 'test-article.md');
            assert.equal(result.title, 'Test Article');
            assert.equal(result.description, 'A test article description.');
            assert.equal(result.slug, 'test-article');
            assert.equal(result.status, 'published');
            assert.deepEqual(result.tags, ['EVM', 'Ethereum']);
            assert.ok(result.date instanceof Date);
        });

        it('returns null for draft articles', () => {
            const content = `---
title: "Draft Article"
description: "Not ready yet."
date: 2026-03-10
status: draft
---

Draft body.`;

            const result = parseArticleFrontmatter(content, 'draft-article.md');
            assert.equal(result, null);
        });

        it('returns null for articles without status field', () => {
            const content = `---
title: "No Status"
description: "Missing status."
date: 2026-03-10
---

Body.`;

            const result = parseArticleFrontmatter(content, 'no-status.md');
            assert.equal(result, null);
        });

        it('returns null for malformed frontmatter', () => {
            const content = `No frontmatter here, just text.`;
            const result = parseArticleFrontmatter(content, 'bad.md');
            assert.equal(result, null);
        });

        it('strips .md extension for slug', () => {
            const content = `---
title: "Slug Test"
description: "Testing slug."
date: 2026-03-10
status: published
---

Body.`;

            const result = parseArticleFrontmatter(content, 'my-cool-article.md');
            assert.equal(result.slug, 'my-cool-article');
        });
    });

    describe('FEATURE_TIPS', () => {
        it('exports exactly 12 feature tips', () => {
            assert.equal(FEATURE_TIPS.length, 12);
        });

        it('each tip has title and description', () => {
            for (const tip of FEATURE_TIPS) {
                assert.ok(typeof tip.title === 'string' && tip.title.length > 0, `Missing title`);
                assert.ok(typeof tip.description === 'string' && tip.description.length > 0, `Missing description`);
            }
        });
    });

    describe('selectSource', () => {
        it('returns a valid source object for features', () => {
            const result = selectSource('features', []);
            assert.ok(result !== null);
            assert.ok(typeof result.title === 'string');
            assert.ok(typeof result.description === 'string');
        });

        it('skips recent IDs when selecting features', () => {
            // Mark all but one feature as recent
            const allButLast = FEATURE_TIPS.slice(0, -1).map(t => t.title);
            const result = selectSource('features', allButLast);
            assert.ok(result !== null);
            assert.equal(result.title, FEATURE_TIPS[FEATURE_TIPS.length - 1].title);
        });

        it('falls back to features when all candidates are recent', () => {
            const allIds = FEATURE_TIPS.map(t => t.title);
            // When all are recent, should still return something (reset behavior)
            const result = selectSource('features', allIds);
            assert.ok(result !== null);
            assert.ok(typeof result.title === 'string');
        });

        it('returns a blog source when sourceType is blog', () => {
            // This reads actual files from disk; just verify it returns something
            const result = selectSource('blog', []);
            // May return a blog article or fall back to features
            assert.ok(result !== null);
            assert.ok(typeof result.title === 'string');
        });

        it('returns a source for trend_scanner (falls back to features)', () => {
            // trend_scanner calls gh CLI which may not have the project set up
            // so it should gracefully fall back to features
            const result = selectSource('trend_scanner', []);
            assert.ok(result !== null);
            assert.ok(typeof result.title === 'string');
        });
    });

    describe('extractKeywords', () => {
        it('extracts lowercase words 3+ chars, removes stop words', () => {
            const result = extractKeywords('How Three Infrastructure Failures Turned a $50M Swap');
            assert.ok(result.has('infrastructure'));
            assert.ok(result.has('failures'));
            assert.ok(result.has('swap'));
            assert.ok(!result.has('how'));
            assert.ok(!result.has('a'));
        });

        it('extracts numbers with units as keywords', () => {
            const result = extractKeywords('$50.4M swapped for $36,000 in one transaction');
            assert.ok(result.has('swapped'));
            assert.ok(result.has('transaction'));
            assert.ok(result.has('50.4m'));
            assert.ok(result.has('36,000'));
        });

        it('returns empty set for empty input', () => {
            const result = extractKeywords('');
            assert.equal(result.size, 0);
        });

        it('handles slug format (hyphen-separated)', () => {
            const result = extractKeywords('50m-defi-routing-failure');
            assert.ok(result.has('defi'));
            assert.ok(result.has('routing'));
            assert.ok(result.has('failure'));
        });
    });
});
