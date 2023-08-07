'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.createTable('stripe_plans', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
          },
          slug: {
            type: Sequelize.STRING,
            unique: true,
            allowNull: false
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false
          },
          capabilities: {
            type: Sequelize.JSON
          },
          stripePriceId: {
            type: Sequelize.STRING,
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

        await queryInterface.createTable('stripe_subscriptions', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
          },
          explorerId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                key: 'id',
                model: {
                    tableName: 'explorers'
                }
            },
            onDelete: 'CASCADE'
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                key: 'id',
                model: {
                    tableName: 'users'
                }
            },
            onDelete: 'CASCADE'
          },
          stripePlanId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                key: 'id',
                model: {
                    tableName: 'stripe_plans'
                }
            },
            onDelete: 'CASCADE'
          },
          stripeId: {
            type: Sequelize.STRING,
            allowNull: false,
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

        await queryInterface.addColumn('explorers', 'stripeSubscriptionId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            key: 'id',
            model: {
                tableName: 'stripe_subscriptions'
            }
          },
          onDelete: 'CASCADE'
        }, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TABLE "stripe_subscriptions"
          ADD CONSTRAINT "explorerAndUserCannotBeNull"
          CHECK (
            ("explorerId" IS NULL AND "userId" IS NOT NULL) OR ("explorerId" IS NOT NULL AND "userId" IS NULL)
          )
        `, { transaction });

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
          await queryInterface.removeColumn('explorers', 'stripeSubscriptionId', { transaction });
          await queryInterface.dropTable('stripe_subscriptions', { transaction });
          await queryInterface.dropTable('stripe_plans', { transaction });

          await transaction.commit();
      } catch(error) {
          console.log(error);
          await transaction.rollback();
          throw error;
      }
  }
};