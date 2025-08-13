'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.addColumn('orbit_batches', 'prevMessageCount', {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'Previous message count before this batch'
      }, { transaction });
      
      await queryInterface.addColumn('orbit_batches', 'newMessageCount', {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'New message count after this batch'
      }, { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.removeColumn('orbit_batches', 'prevMessageCount', { transaction });
      await queryInterface.removeColumn('orbit_batches', 'newMessageCount', { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
