'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.addColumn('users', 'qnId', {
          type: Sequelize.DataTypes.STRING,
          allowNull: true
        }, { transaction });

        await queryInterface.addColumn('workspaces', 'qnEndpointId', {
            type: Sequelize.DataTypes.STRING,
            allowNull: true,
        }, { transaction });

        await transaction.commit();
    } catch(error) {
        console.log(error);
        await transaction.rollback();
        throw error;
    }
  },
  async down(queryInterface, Sequelize) {
      const transaction = await queryInterface.sequelize.transaction();
      try {
          await queryInterface.removeColumn('users', 'qnId', { transaction });
          await queryInterface.removeColumn('workspaces', 'qnEndpointId', { transaction });

          await transaction.commit();
      } catch(error) {
          console.log(error);
          await transaction.rollback();
          throw error;
      }
  }
};
