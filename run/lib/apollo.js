/**
 * @fileoverview Apollo.io API client for contact finding.
 * Searches by company domain and returns the best-matching decision-maker.
 * @module lib/apollo
 */
const { getApolloApiKey } = require('./env');
const logger = require('./logger');

const TITLE_PRIORITY = [
    'Head of Partnerships',
    'VP Partnerships',
    'CTO',
    'Chief Technology Officer',
    'CEO',
    'Chief Executive Officer',
    'Co-founder',
    'Co-Founder',
    'Founder',
    'VP Engineering',
    'VP of Engineering'
];

const APOLLO_TIMEOUT_MS = 15000;

/**
 * Scores a contact by title priority. Lower = better.
 * @param {string} title
 * @returns {number}
 */
function scoreTitlePriority(title) {
    if (!title) return TITLE_PRIORITY.length;
    const lowerTitle = title.toLowerCase();
    const idx = TITLE_PRIORITY.findIndex(t => lowerTitle.includes(t.toLowerCase()));
    return idx === -1 ? TITLE_PRIORITY.length : idx;
}

/**
 * Find the best decision-maker contact at a company domain.
 * @param {string} domain - Company domain
 * @returns {Promise<{name: string, email: string, title: string, linkedin: string}|null>}
 */
async function findContact(domain) {
    const apiKey = getApolloApiKey();
    if (!apiKey) return null;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), APOLLO_TIMEOUT_MS);

        const res = await fetch('https://api.apollo.io/v1/mixed_people/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': apiKey
            },
            body: JSON.stringify({
                q_organization_domains: domain,
                person_titles: TITLE_PRIORITY.slice(0, 6),
                per_page: 10
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);
        if (!res.ok) {
            logger.error(`Apollo API error: ${res.status}`, { location: 'apollo.findContact', domain });
            return null;
        }

        const data = await res.json();
        const people = data.people || [];
        if (!people.length) return null;

        const sorted = people
            .filter(p => p.email)
            .sort((a, b) => scoreTitlePriority(a.title) - scoreTitlePriority(b.title));

        if (!sorted.length) return null;

        const best = sorted[0];
        return {
            name: [best.first_name, best.last_name].filter(Boolean).join(' '),
            email: best.email,
            title: best.title,
            linkedin: best.linkedin_url || null
        };
    } catch (error) {
        logger.error(error.message, { location: 'apollo.findContact', domain, error });
        return null;
    }
}

module.exports = { findContact, scoreTitlePriority };
