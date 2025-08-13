'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable('orbit_batch_block', {
        blockId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'blocks',
            key: 'id'
          }
        },
        batchId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'orbit_batches',
            key: 'id'
          }
        }
      }, { transaction });

      await queryInterface.addConstraint('orbit_batch_block', {
        fields: ['blockId', 'batchId'],
        type: 'primary key',
        name: 'orbit_batch_block_pkey',
        transaction
      });

      await queryInterface.addIndex('orbit_batch_block', ['blockId'], { transaction });
      await queryInterface.addIndex('orbit_batch_block', ['batchId'], { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('orbit_batch_block');
  }
};
