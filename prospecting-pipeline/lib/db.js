/**
 * @fileoverview Postgres client for the prospecting pipeline.
 * Connects to prod DB via PgBouncer. Handles prospect insertion with
 * dedup, customer check, and demo profile matching.
 */
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const MAX_DAILY_INSERTS = 20;

/**
 * Check if a domain is already a customer.
 * @param {string} domain
 * @returns {Promise<boolean>}
 */
export async function isExistingCustomer(domain) {
    if (!domain) return false;

    const result = await pool.query(`
        SELECT 1 FROM users u
        WHERE split_part(u.email, '@', 2) = $1
        UNION
        SELECT 1 FROM workspaces w
        JOIN users u2 ON w."userId" = u2.id
        WHERE split_part(u2.email, '@', 2) = $1
        LIMIT 1
    `, [domain]);

    return result.rows.length > 0;
}

/**
 * Check for existing demo profile and classify lead type.
 * @param {string} domain
 * @returns {Promise<{leadType: string, demoProfileId: number|null, isHighActivity: boolean}>}
 */
export async function checkDemoProfile(domain) {
    if (!domain) return { leadType: 'cold_lead', demoProfileId: null, isHighActivity: false };

    const result = await pool.query(`
        SELECT id, "blockCount", "transactionCount", "contractCount"
        FROM demo_profiles
        WHERE domain = $1
        ORDER BY "createdAt" DESC
        LIMIT 1
    `, [domain]);

    if (!result.rows.length) return { leadType: 'cold_lead', demoProfileId: null, isHighActivity: false };

    const row = result.rows[0];
    const isHighActivity = row.blockCount > 100 || row.transactionCount > 50 || row.contractCount > 5;

    return {
        leadType: 'warm_lead',
        demoProfileId: row.id,
        isHighActivity
    };
}

/**
 * Insert a new prospect if not duplicate.
 * @param {Object} prospect
 * @returns {Promise<{inserted: boolean, id: number|null}>}
 */
export async function insertProspect(prospect) {
    // Dedup check
    if (prospect.domain) {
        const existing = await pool.query('SELECT id FROM prospects WHERE domain = $1', [prospect.domain]);
        if (existing.rows.length > 0) {
            // Update confidence score if new signal adds to it
            await pool.query(
                'UPDATE prospects SET "confidenceScore" = "confidenceScore" + $1, "signalData" = "signalData" || $2, "updatedAt" = NOW() WHERE id = $3',
                [prospect.additionalScore || 0, JSON.stringify(prospect.newSignal || {}), existing.rows[0].id]
            );
            return { inserted: false, id: existing.rows[0].id };
        }
    }

    const result = await pool.query(`
        INSERT INTO prospects (domain, "companyName", "chainName", "chainType", "launchStatus", status, "leadType", "signalSource", "signalData", "confidenceScore", "demoProfileId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING id
    `, [
        prospect.domain, prospect.companyName, prospect.chainName, prospect.chainType,
        prospect.launchStatus, prospect.signalSource === 'raas' ? 'discovery_only' : 'detected',
        prospect.leadType, prospect.signalSource, JSON.stringify(prospect.signalData || {}),
        prospect.confidenceScore, prospect.demoProfileId
    ]);

    // Log detected event
    await pool.query(`
        INSERT INTO prospect_events ("prospectId", event, metadata, "createdAt")
        VALUES ($1, 'detected', $2, NOW())
    `, [result.rows[0].id, JSON.stringify({ source: prospect.signalSource })]);

    return { inserted: true, id: result.rows[0].id };
}

/**
 * Get count of prospects inserted today.
 * @returns {Promise<number>}
 */
export async function getTodayInsertCount() {
    const result = await pool.query(`
        SELECT COUNT(*) as count FROM prospects
        WHERE "createdAt" >= CURRENT_DATE
    `);
    return parseInt(result.rows[0].count, 10);
}

export async function close() {
    await pool.end();
}

export { MAX_DAILY_INSERTS };
