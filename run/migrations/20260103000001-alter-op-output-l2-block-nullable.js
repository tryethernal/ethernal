'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('op_outputs', 'l2BlockNumber', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'L2 block this output covers (null for dispute games until resolved)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('op_outputs', 'l2BlockNumber', {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'L2 block this output covers'
    });
  }
};
