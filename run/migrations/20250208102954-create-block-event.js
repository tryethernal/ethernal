'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
        try {
          await queryInterface.createTable('block_events', {
            workspaceId: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                  key: 'id',
                  model: {
                      tableName: 'workspaces'
                  }
              }
            },
            blockId: {
              primaryKey: true,
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                  key: 'id',
                  model: {
                      tableName: 'blocks'
                  }
              }
            },
            number : {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            timestamp: {
                primaryKey: true,
                type: 'TIMESTAMPTZ',
                allowNull: false,
            },
            transactionCount: {
              type: Sequelize.INTEGER,
              allowNull: false
            },
            baseFeePerGas: {
              type: Sequelize.NUMERIC,
              allowNull: true
            },
            gasLimit: {
              type: Sequelize.NUMERIC,
              allowNull: false
            },
            gasUsed: {
              type: Sequelize.NUMERIC,
              allowNull: false
            },
            gasUsedRatio: {
              type: Sequelize.FLOAT,
              allowNull: true
            },
            priorityFeePerGas: {
              type: Sequelize.ARRAY(Sequelize.NUMERIC),
              allowNull: true
            }
          }, { transaction });

          await queryInterface.sequelize.query(`SELECT create_hypertable('block_events', 'timestamp');`, { transaction });
          await queryInterface.sequelize.query(`
            CREATE INDEX "block_events_workspaceId_timestamp" ON block_events("workspaceId", timestamp DESC);
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
        await queryInterface.dropTable('block_events', { transaction });

        await transaction.commit();
    } catch(error) {
        console.log(error);
        await transaction.rollback();
        throw error;
    }
  }
};
