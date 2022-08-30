'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.createTable('erc_721_tokens', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
          },
          workspaceId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                key: 'id',
                model: {
                    tableName: 'workspaces'
                }
            },
            onDelete: 'CASCADE'
          },
          contractId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                key: 'id',
                model: {
                    tableName: 'contracts'
                }
            },
            onDelete: 'CASCADE'
          },
          owner: {
            type: Sequelize.STRING,
          },
          URI: {
            type: Sequelize.STRING
          },
          tokenId: {
            type: Sequelize.STRING
          },
          index: {
              type: Sequelize.INTEGER,
              allowNull: false
          },
          metadata: {
            type: Sequelize.JSONB,
            defaultValue: {}
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
          'erc_721_tokens',
          {
              fields: ['contractId'],
              name: 'erc_721_tokens_contractId_idx',
              transaction
          }
        );

        await queryInterface.addIndex(
          'erc_721_tokens',
          {
              fields: ['owner', 'workspaceId'],
              name: 'erc_721_tokens_workspaceId_idx',
              transaction
          }
        );

        await queryInterface.addConstraint(
            'erc_721_tokens',
            {
              fields: ['contractId', 'tokenId'],
              type: 'unique',
              name: 'erc_721_tokens_contractId_tokenId_is_unique',
              transaction
            }
        );

        await queryInterface.addConstraint(
            'erc_721_tokens',
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

        await queryInterface.addConstraint(
            'erc_721_tokens',
            {
              fields: ['contractId'],
              type: 'foreign key',
              name: 'fk_contractId_contracts_id',
              references: {
                table: 'contracts',
                field: 'id'
              },
              transaction
            }
        );

        transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
    }
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('erc_721_tokens');
  }
};