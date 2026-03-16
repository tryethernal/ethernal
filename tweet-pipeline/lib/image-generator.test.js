/**
 * @fileoverview Tests for the Gemini-based image generator.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt } from './image-generator.js';

describe('image-generator', () => {
    describe('buildPrompt', () => {
        it('includes style prefix', () => {
            const prompt = buildPrompt({ title: 'Test', subtitle: 'Sub' });
            assert.ok(prompt.includes('#0F1729'), 'Should include dark navy color');
            assert.ok(prompt.includes('#3D95CE'), 'Should include blue accent color');
            assert.ok(prompt.includes('NOT futuristic'), 'Should include style constraint');
        });

        it('places title in large white text', () => {
            const prompt = buildPrompt({ title: 'ERC-8004: Trustless Agents' });
            assert.ok(prompt.includes('Title at top in large white text: "ERC-8004: Trustless Agents"'));
        });

        it('includes metric prominently', () => {
            const prompt = buildPrompt({ title: 'Test', metric: '21,000+' });
            assert.ok(prompt.includes('"21,000+"'));
            assert.ok(prompt.includes('prominently'));
        });

        it('includes diagram description when provided', () => {
            const prompt = buildPrompt({
                title: 'Test',
                diagram: 'two panels: hex on left, decoded on right'
            });
            assert.ok(prompt.includes('Diagram: two panels'));
        });

        it('auto-generates diagram description when no diagram/code/quote', () => {
            const prompt = buildPrompt({ title: 'Test', subtitle: 'Sub' });
            assert.ok(prompt.includes('simple flat diagram'));
        });

        it('includes code block for code specs', () => {
            const prompt = buildPrompt({ title: 'Test', code: 'function foo() {}' });
            assert.ok(prompt.includes('code block'));
            assert.ok(prompt.includes('function foo'));
        });

        it('includes quote for quote specs', () => {
            const prompt = buildPrompt({ title: 'Test', quote: 'Hello world', author: 'Vitalik' });
            assert.ok(prompt.includes('"Hello world"'));
            assert.ok(prompt.includes('Vitalik'));
        });

        it('includes no-repeat rule', () => {
            const prompt = buildPrompt({ title: 'Test' });
            assert.ok(prompt.includes('Do NOT repeat any text'));
        });
    });
});
