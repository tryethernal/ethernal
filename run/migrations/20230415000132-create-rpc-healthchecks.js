'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.createTable('rpc_health_checks', {
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
          isReachable: {
              type: Sequelize.DataTypes.BOOLEAN,
              allowNull: false,
              defaultValue: false
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

        await queryInterface.addColumn('workspaces', 'rpcHealthCheckEnabled', {
          type: Sequelize.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        }, { transaction });

        await queryInterface.sequelize.query(`
            ALTER TABLE ONLY public.rpc_health_checks
            ADD CONSTRAINT unique_workspaceId_rpc_health_checks
            UNIQUE ("workspaceId");
        `, { transaction });

        await transaction.commit();
    } catch(error) {
      console.log(error)
      await transaction.rollback();
      throw error;
    }
  },
  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.dropTable('rpc_health_checks', { transaction });
        await queryInterface.removeColumn('workspaces', 'rpcHealthCheckEnabled', { transaction });
        await transaction.commit();    
    } catch(error) {
      console.log(error)
      await transaction.rollback();
      throw error;
    }
  }
};