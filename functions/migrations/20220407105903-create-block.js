'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable('blocks', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        workspaceId: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        baseFeePerGas: {
          type: Sequelize.STRING
        },
        difficulty: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        extraData: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        gasLimit: {
          type: Sequelize.STRING,
          allowNull: false
        },
        gasUsed: {
          type: Sequelize.STRING,
          allowNull: false
        },
        hash: {
          type: Sequelize.STRING,
          allowNull: false
        },
        miner: {
          type: Sequelize.STRING,
          allowNull: false
        },
        nonce: {
          type: Sequelize.STRING,
          allowNull: false
        },
        number: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        parentHash: {
          type: Sequelize.STRING,
          allowNull: false
        },
        timestamp: {
          type: Sequelize.STRING,
          allowNull: false
        },
        transactionsCount: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        raw: {
          type: Sequelize.JSON,
          allowNull: false
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
          'blocks',
          {
              fields: ['workspaceId'],
              name: 'blocks_workspaceId_idx',
              transaction
          }
      );

      await queryInterface.addConstraint(
        'blocks',
        {
          fields: ['workspaceId', 'number'],
          type: 'unique',
          name: 'blocks_number_workspace_id_is_unique',
          transaction
        }
      );

      await queryInterface.addConstraint(
        'blocks',
        {
          fields: ['workspaceId', 'hash'],
          type: 'unique',
          name: 'blocks_hash_workspace_id_is_unique',
          transaction
        }
      );

      await queryInterface.addConstraint(
        'blocks',
        {
          fields: ['workspaceId'],
          type: 'foreign key',
          name: 'fk_workspaceId_workspaces_id',
          references: {
            table: 'workspaces',
            field: 'id'
          },
          transaction
        }
      );

      await transaction.commit();
    } catch(error) {
      await transaction.rollback();
      throw error;
    }
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('blocks');
  }
};