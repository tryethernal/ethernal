'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.addColumn('contracts', 'has721Metadata', {
          type: Sequelize.DataTypes.BOOLEAN,
          allowNull: true
        }, { transaction });

        await queryInterface.addColumn('contracts', 'has721Enumerable', {
          type: Sequelize.DataTypes.BOOLEAN,
          allowNull: true
        }, { transaction });

        await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.removeColumn('contracts', 'has721Metadata', { transaction });
        await queryInterface.removeColumn('contracts', 'has721Enumerable', { transaction });

        await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
    }
  }
};
