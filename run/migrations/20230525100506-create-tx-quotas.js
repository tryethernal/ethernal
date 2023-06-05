'use strict';

const { sequelize } = require("../models");

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.createTable('transaction_quotas', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
          },
          workspaceId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              key: 'id',
              model: {
                  tableName: 'workspaces'
              }
            },
          },
          count: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
          },
          quota: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          starts_at: {
            type: Sequelize.DATE,
            allowNull: false
          },
          ends_at: {
            type: Sequelize.DATE,
            allowNull: false
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE
          }
        }, { transaction });

        await transaction.commit();
    } catch(error) {
        console.log(error);
        await transaction.rollback();
        throw error;
    }
  },
  async down(queryInterface, Sequelize) {
      const transaction = await queryInterface.sequelize.transaction();
      try {
          await queryInterface.dropTable('transaction_quotas', { transaction });
          await transaction.commit();
      } catch(error) {
          console.log(error);
          await transaction.rollback();
          throw error;
      }
  }
};