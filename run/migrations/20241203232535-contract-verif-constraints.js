'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addConstraint('contract_verifications', {
      fields: ['contractId'],
      type: 'unique',
      name: 'unique_contract_verification_contractId'
    });
  },

  async down (queryInterface) {
    await queryInterface.removeConstraint('contract_verifications', 'unique_contract_verification_contractId');
  }
};
