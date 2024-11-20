'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.addColumn('workspaces', 'skipIntegrityCheck', {
          type: Sequelize.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
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
          await queryInterface.removeColumn('workspaces', 'skipIntegrityCheck', { transaction });

          await transaction.commit();
      } catch(error) {
          console.log(error);
          await transaction.rollback();
          throw error;
      }
  }
};
