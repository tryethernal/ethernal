'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.bulkInsert('stripe_plans', [{
      slug: 'self-hosted',
      name: 'Self Hosted',
      stripePriceId: 'selfhosted',
      capabilities: JSON.stringify({
        custoDomain: true,
        nativeToken: true,
        totalSupply: true,
        statusPage: true,
        branding: true,
        txLimit: 0,
        dataRetention: 0
      }),
      price: 0,
      public: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  async down (queryInterface, Sequelize) {
  }
};
