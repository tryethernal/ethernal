'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE transaction_trace_steps ALTER COLUMN "contractHashedBytecode" DROP NOT NULL;');
  },

  async down (queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE transaction_trace_steps ALTER COLUMN "contractHashedBytecode" SET NOT NULL;');
  }
};
