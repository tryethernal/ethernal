'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable('contracts', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        workspaceId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            key: 'id',
            model: {
              tableName: 'workspaces'
            }
          }
        },
        abi: {
          type: Sequelize.JSON
        },
        address: {
          type: Sequelize.STRING,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING
        },
        patterns: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: false,
          defaultValue: []
        },
        processed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        timestamp: {
          type: Sequelize.STRING
        },
        tokenDecimals: {
          type: Sequelize.INTEGER
        },
        tokenName: {
          type: Sequelize.STRING
        },
        tokenSymbol: {
          type: Sequelize.STRING
        },
        watchedPaths: {
          type: Sequelize.STRING
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

      await queryInterface.sequelize.query(`
        ALTER TABLE ONLY contracts
        ADD CONSTRAINT unique_workspaceId_address_contracts
        UNIQUE ("workspaceId", "address");
      `, { transaction });

      await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
    }
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('contracts');
  }
};