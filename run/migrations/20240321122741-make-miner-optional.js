'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('blocks', 'miner', {
        type: Sequelize.STRING,
        allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('blocks', 'miner', {
        type: Sequelize.STRING,
        allowNull: false
    });
  }
};
