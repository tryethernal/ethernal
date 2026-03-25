/**
 * @fileoverview DeFiLlama raises scraper — monitors recent funding rounds
 * for L2/rollup/appchain-related companies.
 */
import { isExistingCustomer, checkDemoProfile, insertProspect } from '../lib/db.js';
import { calculateScore } from '../lib/classify.js';

const DEFI_LLAMA_RAISES = 'https://api.llama.fi/raises';
const L2_KEYWORDS = ['l2', 'layer 2', 'layer-2', 'rollup', 'appchain', 'app chain', 'chain infrastructure', 'zk-evm', 'zkevm', 'optimistic rollup'];

/**
 * @param {number} maxInserts
 * @returns {Promise<number>}
 */
export default async function scrapeFunding(maxInserts) {
    const res = await fetch(DEFI_LLAMA_RAISES);
    if (!res.ok) throw new Error(`DeFiLlama API error: ${res.status}`);

    const data = await res.json();
    const raises = data.raises || [];
    let inserted = 0;

    // Filter to last 30 days and L2-related keywords
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = raises.filter(r => {
        if (r.date && r.date * 1000 < cutoff) return false;
        const text = [r.name, r.category, r.sector, ...(r.chains || [])].join(' ').toLowerCase();
        return L2_KEYWORDS.some(kw => text.includes(kw));
    });

    for (const raise of recent) {
        if (inserted >= maxInserts) break;

        // DeFiLlama raises include project name but not always a website
        const domain = null; // Resolved later via enrichment pipeline

        if (domain && await isExistingCustomer(domain)) continue;

        const demoInfo = domain ? await checkDemoProfile(domain) : { leadType: 'cold_lead', demoProfileId: null, isHighActivity: false };
        const amount = raise.amount || 0;
        const signalData = { amount, round: raise.round, investors: raise.leadInvestors, source: 'defillama' };
        const score = calculateScore('funding', { amount }, demoInfo);

        const result = await insertProspect({
            domain,
            companyName: raise.name,
            chainName: raise.name,
            chainType: 'other_evm',
            launchStatus: 'announced',
            signalSource: 'funding',
            signalData,
            confidenceScore: score,
            leadType: demoInfo.leadType,
            demoProfileId: demoInfo.demoProfileId
        });

        if (result.inserted) inserted++;
    }

    return inserted;
}
