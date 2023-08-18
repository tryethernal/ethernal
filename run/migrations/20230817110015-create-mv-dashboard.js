'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up (queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.sequelize.query(`
                CREATE MATERIALIZED VIEW transaction_volume_14d AS
                    WITH days AS (
                        SELECT
                            d::date as day
                        FROM generate_series(now()::date - 14, now()::date - 1, interval  '1 day') d
                    ),
                    data AS (
                        SELECT "workspaceId", timestamp::date AS day, count(1)
                        FROM transactions
                        WHERE timestamp >= (now()::date - 14)::timestamptz AND timestamp < (now()::date + 1)::timestamptz
                        GROUP BY timestamp::date, "workspaceId"
                    ),
                    d2 AS (SELECT * FROM data)
                    SELECT 
                        DISTINCT cj."workspaceId", days.day::timestamptz AS timestamp,
                        COALESCE(d2.count, 0) AS count
                    FROM days
                    CROSS JOIN data cj
                    LEFT JOIN d2 ON d2."workspaceId" = cj."workspaceId" AND d2.day = days.day;
            `, { transaction });

            await queryInterface.sequelize.query(`
                CREATE INDEX "transaction_volume_14d_workspaceId"
                ON transaction_volume_14d("workspaceId");
            `, { transaction });

            await queryInterface.sequelize.query(`
                CREATE MATERIALIZED VIEW wallet_volume_14d AS
                    WITH days AS (
                        SELECT
                            d::date as day
                        FROM generate_series(now()::date - 14, now()::date - 1, interval  '1 day') d
                    ),
                    addresses AS (
                        SELECT
                            DISTINCT "from" AS address,
                            "workspaceId",
                            timestamp::date
                        FROM transactions
                        WHERE timestamp >= (now()::date - 14)::timestamptz AND timestamp < (now()::date + 1)::timestamptz
                    ),
                    data AS (
                        SELECT
                            timestamp::date AS day,
                            "workspaceId",
                            COUNT(addresses)
                            FROM addresses
                        WHERE addresses.address <> ''
                        GROUP BY "workspaceId", timestamp
                    ),
                    d2 AS (SELECT * FROM data)
                    SELECT 
                        DISTINCT cj."workspaceId",
                        days.day::timestamptz AS timestamp,
                        COALESCE(d2.count, 0) AS count
                    FROM days
                    CROSS JOIN data cj
                    LEFT JOIN d2 ON d2."workspaceId" = cj."workspaceId" AND d2.day = days.day;
            `, { transaction });

            await queryInterface.sequelize.query(`
                CREATE INDEX "wallet_volume_14d_workspaceId"
                ON wallet_volume_14d("workspaceId");
            `, { transaction });

            await transaction.commit();
        } catch(error) {
            console.log(error);
            await transaction.rollback();
            throw error;
        }
    },

    async down (queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.sequelize.query(`DROP MATERIALIZED VIEW transaction_volume_14d`, { transaction });
            await queryInterface.sequelize.query(`DROP MATERIALIZED VIEW wallet_volume_14d`, { transaction });
            await transaction.commit();
        } catch(error) {
            console.log(error);
            await transaction.rollback();
            throw error;
        }
    }
};
