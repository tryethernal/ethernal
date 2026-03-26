import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateScore, classifyChainType } from './classify.js';

describe('calculateScore', () => {
    it('scores L2Beat announced at 3', () => {
        const score = calculateScore('l2beat', { launchStatus: 'announced' }, { leadType: 'cold_lead', isHighActivity: false });
        assert.equal(score, 3);
    });

    it('scores L2Beat testnet at 5', () => {
        const score = calculateScore('l2beat', { launchStatus: 'testnet' }, { leadType: 'cold_lead', isHighActivity: false });
        assert.equal(score, 5);
    });

    it('adds demo bonus for warm leads', () => {
        const score = calculateScore('l2beat', { launchStatus: 'announced' }, { leadType: 'warm_lead', isHighActivity: true });
        assert.equal(score, 6); // 3 + 3
    });

    it('scores large funding at 4', () => {
        const score = calculateScore('funding', { amount: 10_000_000 }, { leadType: 'cold_lead', isHighActivity: false });
        assert.equal(score, 4);
    });

    it('scores small funding at 2', () => {
        const score = calculateScore('funding', { amount: 1_000_000 }, { leadType: 'cold_lead', isHighActivity: false });
        assert.equal(score, 2);
    });

    it('scores GitHub at 2', () => {
        const score = calculateScore('github', {}, { leadType: 'cold_lead', isHighActivity: false });
        assert.equal(score, 2);
    });

    it('scores RaaS at 1', () => {
        const score = calculateScore('raas', {}, { leadType: 'cold_lead', isHighActivity: false });
        assert.equal(score, 1);
    });
});

describe('classifyChainType', () => {
    it('detects OP Stack', () => {
        assert.equal(classifyChainType('Optimistic Rollup', 'OP Stack'), 'op_stack');
    });

    it('detects Orbit', () => {
        assert.equal(classifyChainType('Optimistic Rollup', 'Arbitrum'), 'orbit');
    });

    it('detects ZK-EVM', () => {
        assert.equal(classifyChainType('ZK Rollup', 'Polygon CDK'), 'zk_evm');
    });

    it('defaults to other_evm', () => {
        assert.equal(classifyChainType('Unknown', 'Unknown'), 'other_evm');
    });
});
