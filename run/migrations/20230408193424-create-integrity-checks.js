'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.createTable('integrity_checks', {
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
          blockId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                key: 'id',
                model: {
                    tableName: 'blocks'
                }
            },
          },
          status: {
              type: Sequelize.DataTypes.ENUM('healthy', 'recovering'),
              allowNull: false,
              defaultValue: 'healthy'
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
            ALTER TABLE ONLY public.integrity_checks
            ADD CONSTRAINT unique_workspaceId_integrity_checks
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
    await queryInterface.dropTable('integrity_checks');
  }
};