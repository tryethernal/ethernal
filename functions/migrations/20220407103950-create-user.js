const { Deferrable } = require('sequelize');

'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      firebaseUserId: {
        allowNull: false,
        type: Sequelize.STRING,
        unique: true
      },
      email: {
          allowNull: false,
          type: Sequelize.STRING,
          unique: true
      },
      apiKey: {
        allowNull: false,
        type: Sequelize.STRING
      },
      currentWorkspaceId: {
        type: Sequelize.INTEGER
      },
      plan: {
        allowNull: false,
        type: Sequelize.STRING,
        defaultValue: 'free'
      },
      stripeCustomerId: {
        allowNull: false,
        type: Sequelize.STRING
      },
      explorerSubscriptionId: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  }
};