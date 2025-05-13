'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert('stripe_plans', [
      {
        slug: 'self-hosted',
        name: 'Self-Hosted',
        stripePriceId: null,
        capabilities: JSON.stringify({
          description: 'Self hosted plan with all capabilities',
          dataRetention: 0,
          skipBilling: true,
          customStartingBlock: true,
          customDomain: true,
          branding: true,
          nativeToken: true,
          totalSupply: true,
          txLimit: 0
        }),
        price: 0,
        public: true,
        createdAt: now,
        updatedAt: now
      }
    ], {});
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('stripe_plans', { slug: 'self-hosted' }, {});
  }
}; 