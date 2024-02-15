'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
        try {
          await queryInterface.createTable('transaction_events', {
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
            transactionId: {
              primaryKey: true,
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                  key: 'id',
                  model: {
                      tableName: 'transactions'
                  }
              }
            },
            blockNumber : {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            timestamp: {
                primaryKey: true,
                type: 'TIMESTAMPTZ',
                allowNull: false,
            },
            transactionFee: {
              type: 'NUMERIC',
              allowNull: false
            },
            gasPrice: {
              type: 'NUMERIC',
              allowNull: false
            },
            gasUsed: {
              type: 'NUMERIC',
              allowNull: false
            },
            from: {
              type: 'VARCHAR(42)',
              allowNull: false
            },
            to: {
              type: 'VARCHAR(42)',
              allowNull: true
            }
          }, { transaction });

          await queryInterface.sequelize.query(`SELECT create_hypertable('transaction_events', 'timestamp');`, { transaction });
          await queryInterface.sequelize.query(`
            CREATE INDEX "transaction_events_workspaceId_timestamp" ON transaction_events("workspaceId", timestamp DESC);
          `, { transaction });

          await queryInterface.createTable('token_transfer_events', {
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
            tokenTransferId: {
              primaryKey: true,
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                  key: 'id',
                  model: {
                      tableName: 'token_transfers'
                  }
              }
            },
            blockNumber : {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            timestamp: {
                primaryKey: true,
                type: 'TIMESTAMPTZ',
                allowNull: false,
            },
            amount: {
              type: 'NUMERIC',
              allowNull: false
            },
            token: {
              type: 'VARCHAR(42)',
              allowNull: false
            },
            tokenType: {
              type: Sequelize.STRING,
              allowNull: true
            },
            src: {
              type: 'VARCHAR(42)',
              allowNull: false
            },
            dst: {
              type: 'VARCHAR(42)',
              allowNull: false
            }
          }, { transaction });
          await queryInterface.sequelize.query(`SELECT create_hypertable('token_transfer_events', 'timestamp');`, { transaction });
          await queryInterface.sequelize.query(`
            CREATE INDEX "token_transfer_events_workspaceId_timestamp" ON transaction_events("workspaceId", timestamp DESC);
          `, { transaction });

          await queryInterface.createTable('token_balance_change_events', {
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
            tokenBalanceChangeId: {
              primaryKey: true,
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                  key: 'id',
                  model: {
                      tableName: 'token_balance_changes'
                  }
              }
            },
            blockNumber : {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            timestamp: {
                primaryKey: true,
                type: 'TIMESTAMPTZ',
                allowNull: false,
            },
            token: {
              type: 'VARCHAR(42)',
              allowNull: false
            },
            address: {
              type: 'VARCHAR(42)',
              allowNull: false
            },
            currentBalance: {
              type: 'NUMERIC',
              allowNull: false
            },
            tokenType: {
              type: Sequelize.STRING,
              allowNull: true
            },
          }, { transaction });
          await queryInterface.sequelize.query(`SELECT create_hypertable('token_balance_change_events', 'timestamp');`, { transaction });
          await queryInterface.sequelize.query(`
            CREATE INDEX "token_balance_change_events_workspaceId_timestamp" ON token_balance_change_events("workspaceId", timestamp DESC);
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
        await queryInterface.dropTable('transaction_events', { transaction });
        await queryInterface.dropTable('token_transfer_events', { transaction });
        await queryInterface.dropTable('token_balance_change_events', { transaction });

        await transaction.commit();
    } catch(error) {
        console.log(error);
        await transaction.rollback();
        throw error;
    }
  }
};
