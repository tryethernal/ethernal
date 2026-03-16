/**
 * @fileoverview Tests for the Playwright-based image generator.
 */
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, unlinkSync, mkdirSync, statSync, rmdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTemplateUrl, generateImage } from './image-generator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('image-generator', () => {
    const tmpDir = join(__dirname, '..', '.test-output');

    describe('buildTemplateUrl', () => {
        it('builds correct file:// URL with params for stat_card', () => {
            const url = buildTemplateUrl('stat_card', { headline: '4,200+', subtitle: 'Contracts verified' });
            assert.ok(url.startsWith('file://'), 'Should be a file:// URL');
            assert.ok(url.includes('stat-card.html'), 'Should reference stat-card.html');
            assert.ok(url.includes('headline=4%2C200%2B'), 'Should encode headline param');
            assert.ok(url.includes('subtitle=Contracts+verified'), 'Should include subtitle param');
        });

        it('builds correct URL for eip_card', () => {
            const url = buildTemplateUrl('eip_card', { number: 'EIP-4844', title: 'Shard Blob Transactions', summary: 'Proto-danksharding' });
            assert.ok(url.includes('eip-card.html'), 'Should reference eip-card.html');
            assert.ok(url.includes('number=EIP-4844'), 'Should include number param');
            assert.ok(url.includes('title=Shard+Blob+Transactions'), 'Should include title param');
            assert.ok(url.includes('summary=Proto-danksharding'), 'Should include summary param');
        });

        it('builds correct URL for code_snippet', () => {
            const url = buildTemplateUrl('code_snippet', { code: 'console.log("hi")', lang: 'javascript' });
            assert.ok(url.includes('code-snippet.html'), 'Should reference code-snippet.html');
        });

        it('builds correct URL for quote_card', () => {
            const url = buildTemplateUrl('quote_card', { quote: 'Test quote', author: 'Vitalik' });
            assert.ok(url.includes('quote-card.html'), 'Should reference quote-card.html');
        });

        it('throws for unknown type', () => {
            assert.throws(
                () => buildTemplateUrl('unknown_type', { foo: 'bar' }),
                { message: /unknown template type/i }
            );
        });
    });

    describe('generateImage', () => {
        const outputFiles = [];

        after(() => {
            for (const f of outputFiles) {
                try { unlinkSync(f); } catch { /* ignore */ }
            }
            try { rmdirSync(tmpDir); } catch { /* ignore */ }
        });

        it('renders stat_card to actual PNG file', async () => {
            mkdirSync(tmpDir, { recursive: true });
            const outputPath = join(tmpDir, 'stat-card-test.png');
            outputFiles.push(outputPath);

            await generateImage({ type: 'stat_card', headline: '12,345', subtitle: 'Blocks indexed' }, outputPath);

            assert.ok(existsSync(outputPath), 'PNG file should exist');
            const stats = statSync(outputPath);
            assert.ok(stats.size > 1000, `PNG should be non-trivial size, got ${stats.size} bytes`);
        });
    });
});
