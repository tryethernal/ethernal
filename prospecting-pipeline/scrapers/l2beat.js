/**
 * @fileoverview L2Beat scraper — fetches project data from L2Beat's public API
 * to detect new/upcoming EVM-compatible L2s.
 *
 * API response: { projects: { [slug]: { id, name, slug, category, providers, stage, isUpcoming, ... } } }
 * We target Stage 0, "Not applicable", and "Under review" projects as early-stage prospects.
 */
import { isExistingCustomer, checkDemoProfile, insertProspect } from '../lib/db.js';
import { calculateScore, classifyChainType } from '../lib/classify.js';

const L2BEAT_SUMMARY_API = 'https://l2beat.com/api/scaling/summary';

// Well-known project slugs to skip (mature chains, not prospects)
const SKIP_SLUGS = new Set([
    'arbitrum', 'base', 'optimism', 'polygon-pos', 'polygon-zkevm',
    'zksync-era', 'zksync-lite', 'linea', 'scroll', 'starknet', 'mantle', 'blast',
    'manta-pacific', 'mode', 'metis', 'immutablex', 'dydx', 'loopring',
    'arbitrum-nova', 'celo', 'bob', 'abstract', 'lens', 'morph', 'sophon'
]);

/**
 * @param {number} maxInserts - Maximum new prospects to insert
 * @returns {Promise<number>} Number of prospects inserted
 */
export default async function scrapeL2Beat(maxInserts) {
    const res = await fetch(L2BEAT_SUMMARY_API);
    if (!res.ok) throw new Error(`L2Beat API error: ${res.status}`);

    const data = await res.json();
    // API returns { projects: { slug: projectObj } } — an object, not an array
    const projects = Object.values(data.projects || {});
    let inserted = 0;

    for (const project of projects) {
        if (inserted >= maxInserts) break;

        // Skip mature chains
        if (project.stage === 'Stage 2' || project.stage === 'Stage 1') continue;
        if (SKIP_SLUGS.has(project.slug)) continue;
        if (project.isArchived) continue;

        // Only EVM-compatible categories
        const category = (project.category || '').toLowerCase();
        if (!category.includes('rollup') && !category.includes('validium') && !category.includes('optimium')) continue;

        // Domain not available from summary API — set null, resolved during enrichment
        const domain = null;

        const provider = (project.providers || [])[0] || '';
        const chainType = classifyChainType(category, provider);
        const launchStatus = project.isUpcoming ? 'announced'
            : project.stage === 'Not applicable' ? 'testnet'
            : project.stage === 'Under review' ? 'testnet'
            : 'testnet'; // Stage 0

        const demoInfo = domain ? await checkDemoProfile(domain) : { leadType: 'cold_lead', demoProfileId: null, isHighActivity: false };
        const signalData = { l2beatId: project.id, l2beatSlug: project.slug, stage: project.stage, category, provider };
        const score = calculateScore('l2beat', { launchStatus }, demoInfo);

        const result = await insertProspect({
            domain,
            companyName: project.name,
            chainName: project.name,
            chainType,
            launchStatus,
            signalSource: 'l2beat',
            signalData,
            confidenceScore: score,
            leadType: demoInfo.leadType,
            demoProfileId: demoInfo.demoProfileId
        });

        if (result.inserted) inserted++;
    }

    return inserted;
}
