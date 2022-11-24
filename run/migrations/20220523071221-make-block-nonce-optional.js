'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('blocks', 'nonce', {
        type: Sequelize.STRING,
        allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('blocks', 'nonce', {
        type: Sequelize.STRING,
        allowNull: false
    });
  }
};
