/**
 * @fileoverview GitHub scraper — finds repos forking OP Stack, Nitro, or other rollup frameworks.
 */
import { isExistingCustomer, checkDemoProfile, insertProspect } from '../lib/db.js';
import { calculateScore } from '../lib/classify.js';

const FRAMEWORK_REPOS = [
    { owner: 'ethereum-optimism', repo: 'optimism', type: 'op_stack' },
    { owner: 'OffchainLabs', repo: 'nitro', type: 'orbit' }
];

const DAYS_LOOKBACK = 30;

/**
 * @param {number} maxInserts
 * @returns {Promise<number>}
 */
export default async function scrapeGitHub(maxInserts) {
    const headers = process.env.GH_TOKEN ? { Authorization: `token ${process.env.GH_TOKEN}` } : {};
    let inserted = 0;

    for (const framework of FRAMEWORK_REPOS) {
        if (inserted >= maxInserts) break;

        const since = new Date(Date.now() - DAYS_LOOKBACK * 24 * 60 * 60 * 1000).toISOString();
        const res = await fetch(
            `https://api.github.com/repos/${framework.owner}/${framework.repo}/forks?sort=newest&per_page=30`,
            { headers }
        );
        if (!res.ok) continue;

        const forks = await res.json();

        for (const fork of forks) {
            if (inserted >= maxInserts) break;

            // Filter noise
            if (fork.stargazers_count < 1 && fork.forks_count < 1) continue;
            if (new Date(fork.pushed_at) < new Date(since)) continue;

            // Get org website for domain
            let domain = null;
            if (fork.owner?.type === 'Organization') {
                const orgRes = await fetch(`https://api.github.com/orgs/${fork.owner.login}`, { headers });
                if (orgRes.ok) {
                    const org = await orgRes.json();
                    if (org.blog) {
                        try { domain = new URL(org.blog.startsWith('http') ? org.blog : `https://${org.blog}`).hostname; } catch { /* skip */ }
                    }
                }
            }
            if (!domain && fork.homepage) {
                try { domain = new URL(fork.homepage.startsWith('http') ? fork.homepage : `https://${fork.homepage}`).hostname; } catch { /* skip */ }
            }

            if (domain && await isExistingCustomer(domain)) continue;

            const demoInfo = domain ? await checkDemoProfile(domain) : { leadType: 'cold_lead', demoProfileId: null, isHighActivity: false };
            const signalData = { repoUrl: fork.html_url, stars: fork.stargazers_count, framework: framework.repo };
            const score = calculateScore('github', {}, demoInfo);

            const result = await insertProspect({
                domain,
                companyName: fork.owner?.login || fork.name,
                chainName: fork.name,
                chainType: framework.type,
                launchStatus: 'announced',
                signalSource: 'github',
                signalData,
                confidenceScore: score,
                leadType: demoInfo.leadType,
                demoProfileId: demoInfo.demoProfileId
            });

            if (result.inserted) inserted++;
        }
    }

    return inserted;
}
