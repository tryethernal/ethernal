'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addIndex(
        'explorer_domains',
        {
            fields: ['explorerId'],
            name: 'explorer_domains_explorerId_idx',
        }
      );

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
        await queryInterface.sequelize.query(`
          DROP INDEX "explorer_domains_explorerId_idx"
        `);

          await transaction.commit();
      } catch(error) {
          console.log(error);
          await transaction.rollback();
          throw error;
      }
  }
};
