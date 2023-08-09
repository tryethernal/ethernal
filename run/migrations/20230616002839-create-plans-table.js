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
          price: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          public: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
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
            type: Sequelize.STRING
          },
          status: {
            type: Sequelize.DataTypes.ENUM('active', 'pending_cancelation'),
            allowNull: false,
            defaultValue: 'active'
          },
          cycleEndsAt: {
            type: Sequelize.DATE
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
          await queryInterface.dropTable('stripe_subscriptions', { transaction });
          await queryInterface.dropTable('stripe_plans', { transaction });
          await queryInterface.sequelize.query('DROP TYPE enum_stripe_subscriptions_status;', { transaction });

          await transaction.commit();
      } catch(error) {
          console.log(error);
          await transaction.rollback();
          throw error;
      }
  }
};