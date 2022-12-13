'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('erc_721_tokens', 'URI', {
        type: Sequelize.TEXT
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('erc_721_tokens', 'URI', {
        type: Sequelize.STRING
    });
  }
};
