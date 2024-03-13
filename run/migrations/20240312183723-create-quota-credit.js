'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.createTable('stripe_quota_extensions', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
          },
          stripeSubscriptionId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                key: 'id',
                model: {
                    tableName: 'explorers'
                }
            }
          },
          stripePlanId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                key: 'id',
                model: {
                    tableName: 'stripe_plans'
                }
            }
          },
          stripeId: {
            type: Sequelize.STRING,
            allowNull: false
          },
          quota: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
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
    await queryInterface.dropTable('stripe_quota_subscriptions');
  }
};