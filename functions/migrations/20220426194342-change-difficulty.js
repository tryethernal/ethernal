'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('blocks', 'difficulty', {
        type: Sequelize.STRING
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('blocks', 'difficulty', {
        type: Sequelize.INTEGER
    });
  }
};
