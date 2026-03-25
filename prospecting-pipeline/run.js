#!/usr/bin/env node
/**
 * @fileoverview Orchestrator for the prospecting signal detection pipeline.
 * Runs all scrapers sequentially, respects daily insertion limit.
 */
import { close, getTodayInsertCount, MAX_DAILY_INSERTS } from './lib/db.js';

const SCRAPERS = ['l2beat', 'funding', 'github', 'raas'];

async function main() {
    console.log(`[${new Date().toISOString()}] Prospecting pipeline starting`);

    let totalInserted = 0;

    for (const name of SCRAPERS) {
        const currentCount = await getTodayInsertCount();
        if (currentCount >= MAX_DAILY_INSERTS) {
            console.log(`Daily limit reached (${MAX_DAILY_INSERTS}), stopping`);
            break;
        }

        const remaining = MAX_DAILY_INSERTS - currentCount;
        console.log(`Running ${name} scraper (${remaining} slots remaining)`);

        try {
            const { default: scraper } = await import(`./scrapers/${name}.js`);
            const inserted = await scraper(remaining);
            totalInserted += inserted;
            console.log(`${name}: ${inserted} new prospects`);
        } catch (error) {
            console.error(`${name} scraper failed:`, error.message);
        }
    }

    console.log(`Pipeline complete: ${totalInserted} new prospects`);
    await close();
}

main().catch(error => {
    console.error('Pipeline fatal error:', error);
    process.exit(1);
});
