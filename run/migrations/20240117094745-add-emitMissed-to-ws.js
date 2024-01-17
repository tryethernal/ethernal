'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.addColumn('workspaces', 'emitMissedBlocks', {
          type: Sequelize.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        }, { transaction });

        await queryInterface.addColumn('workspaces', 'skipFirstBlock', {
          type: Sequelize.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
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
        await queryInterface.removeColumn('workspaces', 'emitMissedBlocks', { transaction });
        await queryInterface.removeColumn('workspaces', 'skipFirstBlock', { transaction });

        await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
    }
  }
};
