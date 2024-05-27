'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.addColumn('workspaces', 'rateLimitInterval', {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: true
        });
        await queryInterface.addColumn('workspaces', 'rateLimitMaxInInterval', {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: true
        });
        await transaction.commit();
    } catch(error) {
      console.log(error)
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.removeColumn('workspaces', 'rateLimitInterval');
        await queryInterface.removeColumn('workspaces', 'rateLimitMaxInInterval');
        await transaction.commit();
    } catch(error) {
      console.log(error)
      await transaction.rollback();
      throw error;
    }
  }
};
