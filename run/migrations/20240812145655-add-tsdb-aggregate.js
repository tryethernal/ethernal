'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(`
        CREATE MATERIALIZED VIEW transaction_volume_daily
        WITH (timescaledb.continuous) AS
          SELECT
              "workspaceId",
              time_bucket('1 day', timestamp) AS timestamp,
              coalesce(count(1), 0) AS count
          FROM transaction_events
          GROUP BY "workspaceId", time_bucket('1 day', timestamp)
        WITH NO DATA;
      `, { transaction });

      await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW active_wallets_daily
      WITH (timescaledb.continuous) AS
        SELECT
            "workspaceId",
            time_bucket('1 day', timestamp) AS timestamp,
            coalesce(COUNT(DISTINCT "from"), 0) AS count
        FROM transaction_events
        GROUP BY "workspaceId", time_bucket('1 day', timestamp)
      WITH NO DATA;
    `, { transaction });

    await queryInterface.sequelize.query(`
      ALTER MATERIALIZED VIEW transaction_volume_daily set (timescaledb.materialized_only = false);
    `, { transaction });

    await queryInterface.sequelize.query(`
      ALTER MATERIALIZED VIEW active_wallets_daily set (timescaledb.materialized_only = false);
    `, { transaction });

      await transaction.commit();

      await queryInterface.sequelize.query(`
        CALL refresh_continuous_aggregate('transaction_volume_daily',
          NULL,
          localtimestamp - INTERVAL '1 week'
        );
      `);

      await queryInterface.sequelize.query(`
        CALL refresh_continuous_aggregate('active_wallets_daily',
          NULL,
          localtimestamp - INTERVAL '1 week'
        );
      `);

      await queryInterface.sequelize.query(`
        SELECT add_continuous_aggregate_policy('transaction_volume_daily',
        start_offset => INTERVAL '1 WEEK',
        end_offset => INTERVAL '1 DAY',
        schedule_interval => INTERVAL '1 DAY');
      `);

      await queryInterface.sequelize.query(`
        SELECT add_continuous_aggregate_policy('active_wallets_daily',
        start_offset => INTERVAL '1 WEEK',
        end_offset => INTERVAL '1 DAY',
        schedule_interval => INTERVAL '1 DAY');
      `);
    } catch(error) {
        console.log(error);
        await transaction.rollback();
        throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query('DROP MATERIALIZED VIEW transaction_volume_daily', { transaction });
      await queryInterface.sequelize.query('DROP MATERIALIZED VIEW active_wallets_daily', { transaction });
      await transaction.commit();
    } catch(error) {
        console.log(error);
        await transaction.rollback();
        throw error;
    }
  }
};
