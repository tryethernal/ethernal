'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable('transactions', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        blockId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            key: 'id',
            model: {
              tableName: 'blocks'
            }
          }
        },
        blockHash: {
          type: Sequelize.STRING,
          allowNull: false
        },
        blockNumber: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        chainId: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        confirmations: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        data: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        parsedError: {
          type: Sequelize.STRING
        },
        rawError: {
          type: Sequelize.JSON
        },
        from: {
          type: Sequelize.STRING,
          allowNull: false
        },
        gasLimit: {
          type: Sequelize.STRING,
          allowNull: false
        },
        gasPrice: {
          type: Sequelize.STRING,
          allowNull: false
        },
        hash: {
          type: Sequelize.STRING,
          allowNull: false
        },
        methodLabel: {
          type: Sequelize.STRING,
        },
        methodName: {
          type: Sequelize.STRING
        },
        methodSignature: {
          type: Sequelize.STRING
        },
        nonce: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        r: {
          type: Sequelize.STRING,
          allowNull: false
        },
        s: {
          type: Sequelize.STRING,
          allowNull: false
        },
        timestamp: {
          type: Sequelize.STRING,
          allowNull: false
        },
        to: {
          type: Sequelize.STRING
        },
        transactionIndex: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        type: {
          type: Sequelize.INTEGER,
        },
        v: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        value: {
          type: Sequelize.STRING,
          allowNull: false
        },
        raw: {
          type: Sequelize.JSON,
          allowNull: false
        },
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
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      }, { transaction });

      await queryInterface.addIndex(
          'transactions',
          {
              fields: ['workspaceId'],
              name: 'transactions_workspaceId_idx',
              transaction
          }
      );

      await queryInterface.addIndex(
          'transactions',
          {
              fields: ['blockNumber', 'workspaceId'],
              name: 'transactions_blockNumber_workspaceId_idx',
              transaction
          }
      );

      await queryInterface.addIndex(
          'transactions',
          {
              fields: ['from', 'workspaceId'],
              name: 'transactions_from_workspaceId_idx',
              transaction
          }
      );

      await queryInterface.addIndex(
          'transactions',
          {
              fields: ['to', 'workspaceId'],
              name: 'transactions_to_workspaceId_idx',
              transaction
          }
      );

      await queryInterface.sequelize.query(`ALTER TABLE ONLY public.transactions ADD CONSTRAINT fk_blockNumber_workspaceId_blocks_number_workspaceId FOREIGN KEY ("blockNumber", "workspaceId") REFERENCES public.blocks(number, "workspaceId") DEFERRABLE;`, { transaction });

      await transaction.commit();
    } catch(error) {
      console.log(error)
      await transaction.rollback();
      throw error;
    }
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('transactions');
  }
};