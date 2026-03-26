/**
 * @fileoverview L2Beat scraper — fetches project data from L2Beat's public API
 * to detect new/upcoming EVM-compatible L2s.
 */
import { isExistingCustomer, checkDemoProfile, insertProspect } from '../lib/db.js';
import { calculateScore, classifyChainType } from '../lib/classify.js';

const L2BEAT_SUMMARY_API = 'https://l2beat.com/api/scaling/summary';

/**
 * @param {number} maxInserts - Maximum new prospects to insert
 * @returns {Promise<number>} Number of prospects inserted
 */
export default async function scrapeL2Beat(maxInserts) {
    const res = await fetch(L2BEAT_SUMMARY_API);
    if (!res.ok) throw new Error(`L2Beat API error: ${res.status}`);

    const data = await res.json();
    const projects = data.data?.projects || data.projects || [];
    let inserted = 0;

    for (const project of projects) {
        if (inserted >= maxInserts) break;

        // Skip mainnet projects — we want pre-launch/upcoming
        if (project.stage === 'Stage 2' || project.stage === 'Stage 1') continue;

        // Extract domain from project links
        let domain = null;
        const website = project.links?.websites?.[0] || project.website;
        if (website) {
            try {
                domain = new URL(website.startsWith('http') ? website : `https://${website}`).hostname;
                // Strip www prefix
                domain = domain.replace(/^www\./, '');
            } catch { /* skip invalid URLs */ }
        }

        if (domain && await isExistingCustomer(domain)) continue;

        const technology = project.technology || project.type || '';
        const provider = project.provider || '';
        const chainType = classifyChainType(technology, provider);
        const launchStatus = project.stage === 'NotApplicable' ? 'announced' : 'testnet';

        const demoInfo = domain ? await checkDemoProfile(domain) : { leadType: 'cold_lead', demoProfileId: null, isHighActivity: false };
        const signalData = { l2beatId: project.id, stage: project.stage, technology, provider, website };
        const score = calculateScore('l2beat', { launchStatus }, demoInfo);

        const result = await insertProspect({
            domain,
            companyName: project.name || project.display?.name,
            chainName: project.name || project.display?.name,
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
