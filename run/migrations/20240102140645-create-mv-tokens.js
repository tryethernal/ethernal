'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up (queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.sequelize.query(`
                CREATE MATERIALIZED VIEW token_holder_count_14d AS
                  WITH days as (
                    SELECT
                      date_trunc('day', d) as day
                    FROM generate_series(now()::date - 14, now()::date - 1, interval  '1 day') d
                  )
                  SELECT
                    days.day as timestamp,
                    tbc.token,
                    tbc."workspaceId",
                    (
                      SELECT COUNT(DISTINCT(address))
                      FROM token_balance_changes
                      LEFT JOIN transactions ON token_balance_changes."transactionId" = transactions.id
                      WHERE (
                        SELECT "currentBalance"
                        FROM token_balance_changes
                        LEFT JOIN transactions ON token_balance_changes."transactionId" = transactions.id
                        WHERE transactions.timestamp::date <= days.day
                        AND token_balance_changes.address = address
                        AND token_balance_changes.token = tbc.token
                        AND token_balance_changes."workspaceId" = tbc."workspaceId"
                        ORDER BY timestamp DESC LIMIT 1
                      )::numeric > 0
                      AND token_balance_changes."workspaceId" = tbc."workspaceId"
                      AND token_balance_changes.token = tbc.token
                      AND transactions.timestamp::date <= days.day
                    ) AS count
                  FROM days, token_balance_changes tbc
                  GROUP BY days.day, tbc."workspaceId", tbc.token
                  ORDER BY day DESC
                WITH NO DATA
            `, { transaction });

            await queryInterface.sequelize.query(`
                CREATE UNIQUE INDEX "token_holder_count_14d_workspaceId_timestamp_token"
                ON token_holder_count_14d("workspaceId", timestamp, token);
            `, { transaction });

            await queryInterface.sequelize.query(`
                CREATE MATERIALIZED VIEW token_transfer_volume_14d AS
                  WITH days as (
                    SELECT
                      date_trunc('day', d) as day
                    FROM generate_series(now()::date - 14, now()::date - 1, interval  '1 day') d
                  )
                  SELECT
                    days.day timestamp,
                    tt.token,
                    tt."workspaceId",
                    (
                      SELECT count(1)
                      FROM token_transfers
                      LEFT JOIN transactions ON token_transfers."transactionId" = transactions.id
                      WHERE token_transfers.token = tt.token
                      AND transactions.timestamp::date = days.day
                      AND token_transfers."workspaceId" = tt."workspaceId"
                    ) AS count
                  FROM days, token_transfers tt
                  GROUP BY days.day, tt."workspaceId", tt.token
                  ORDER BY days.day ASC
                WITH NO DATA
            `, { transaction });

            await queryInterface.sequelize.query(`
                CREATE UNIQUE INDEX "token_transfer_volume_14d_workspaceId_timestamp_token"
                ON token_transfer_volume_14d("workspaceId", timestamp, token);
            `, { transaction });

            await queryInterface.sequelize.query(`
                CREATE MATERIALIZED VIEW token_circulating_supply_14d AS
                  WITH days as (
                    SELECT
                      date_trunc('day', d) as day
                    FROM generate_series(now()::date - 14, now()::date - 1, interval  '1 day') d
                  )
                  SELECT
                    days.day AS timestamp,
                    tbc.token,
                    tbc."workspaceId",
                    (
                      SELECT coalesce(sum(diff::numeric), 0)
                      FROM token_balance_changes
                      LEFT JOIN transactions ON token_balance_changes."transactionId" = transactions.id
                      WHERE token_balance_changes.token = tbc.token
                      AND token_balance_changes."workspaceId" = tbc."workspaceId"
                      AND transactions.timestamp::date <= days.day
                    ) AS supply
                  FROM days, token_balance_changes tbc
                  GROUP BY days.day, tbc."workspaceId", tbc.token
                WITH NO DATA
            `, { transaction });

            await queryInterface.sequelize.query(`
                CREATE UNIQUE INDEX "token_circulating_supply_14d_workspaceId_timestamp_token"
                ON token_circulating_supply_14d("workspaceId", timestamp, token);
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
            await queryInterface.sequelize.query(`DROP MATERIALIZED VIEW token_holder_count_14d`, { transaction });
            await queryInterface.sequelize.query(`DROP MATERIALIZED VIEW token_transfer_volume_14d`, { transaction });
            await queryInterface.sequelize.query(`DROP MATERIALIZED VIEW token_circulating_supply_14d`, { transaction });
            await transaction.commit();
        } catch(error) {
            console.log(error);
            await transaction.rollback();
            throw error;
        }
    }
};
