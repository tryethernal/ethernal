/**
 * @fileoverview Lead classification and confidence scoring for prospects.
 */

const SIGNAL_WEIGHTS = {
    l2beat_announced: 3,
    l2beat_testnet: 5,
    funding_small: 2,  // < $5M
    funding_large: 4,  // >= $5M
    github_active: 2,
    raas_listing: 1,
    demo_high_activity: 3,
    demo_low_activity: 1
};

/**
 * Calculate confidence score for a prospect.
 * @param {string} signalSource - l2beat, funding, github, raas
 * @param {Object} signalData - Source-specific data
 * @param {Object} demoInfo - From checkDemoProfile()
 * @returns {number}
 */
export function calculateScore(signalSource, signalData, demoInfo) {
    let score = 0;

    if (signalSource === 'l2beat') {
        score += signalData.launchStatus === 'announced' ? SIGNAL_WEIGHTS.l2beat_announced : SIGNAL_WEIGHTS.l2beat_testnet;
    } else if (signalSource === 'funding') {
        score += (signalData.amount && signalData.amount >= 5_000_000) ? SIGNAL_WEIGHTS.funding_large : SIGNAL_WEIGHTS.funding_small;
    } else if (signalSource === 'github') {
        score += SIGNAL_WEIGHTS.github_active;
    } else if (signalSource === 'raas') {
        score += SIGNAL_WEIGHTS.raas_listing;
    }

    if (demoInfo.leadType === 'warm_lead') {
        score += demoInfo.isHighActivity ? SIGNAL_WEIGHTS.demo_high_activity : SIGNAL_WEIGHTS.demo_low_activity;
    }

    return score;
}

/**
 * Determine chain type from L2Beat technology or other signals.
 * @param {string} technology - e.g., "Optimistic Rollup", "ZK Rollup"
 * @param {string} [provider] - e.g., "OP Stack", "Arbitrum"
 * @returns {string} chainType enum value
 */
export function classifyChainType(technology, provider) {
    const tech = (technology || '').toLowerCase();
    const prov = (provider || '').toLowerCase();

    if (prov.includes('op stack') || prov.includes('optimism')) return 'op_stack';
    if (prov.includes('arbitrum') || prov.includes('orbit') || prov.includes('nitro')) return 'orbit';
    if (tech.includes('zk') || prov.includes('zk') || prov.includes('polygon cdk') || prov.includes('scroll') || prov.includes('linea')) return 'zk_evm';
    return 'other_evm';
}

export { SIGNAL_WEIGHTS };
