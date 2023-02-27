'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.addColumn('users', 'passwordHash', {
          type: Sequelize.DataTypes.STRING,
          allowNull: true
        });
        await queryInterface.addColumn('users', 'passwordSalt', {
          type: Sequelize.DataTypes.STRING,
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
        await queryInterface.removeColumn('users', 'passwordHash');
        await queryInterface.removeColumn('users', 'passwordSalt');
        await transaction.commit();
    } catch(error) {
      console.log(error)
      await transaction.rollback();
      throw error;
    }
  }
};
