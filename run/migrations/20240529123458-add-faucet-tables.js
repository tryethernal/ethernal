'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.createTable('explorer_faucets', {
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
            }
          },
          address: {
            type: Sequelize.STRING,
            allowNull: false
          },
          privateKey: {
            type: Sequelize.STRING,
            allowNull: false
          },
          amount: {
            type: Sequelize.STRING,
            allowNull: false
          },
          interval: {
            type: Sequelize.INTEGER,
            allowNull: false
          },
          active: {
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

        await queryInterface.createTable('faucet_drips', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
          },
          explorerFaucetId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                key: 'id',
                model: {
                    tableName: 'explorer_faucets'
                }
            },
          },
          address: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          amount: {
            type: Sequelize.FLOAT,
            allowNull: false,
          },
          transactionHash: {
            type: Sequelize.STRING,
            allowNull: true
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false
          }
        }, { transaction });

        await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX "faucet_drip_address_faucet_id_pending_state"
          ON faucet_drips("explorerFaucetId", "address")
          WHERE "transactionHash" IS NULL;
        `, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TABLE explorer_faucets
          ADD CONSTRAINT positive_interval CHECK (interval > 0);
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
          await queryInterface.dropTable('faucet_drips', { transaction });
          await queryInterface.dropTable('explorer_faucets', { transaction });

          await transaction.commit();
      } catch(error) {
          console.log(error);
          await transaction.rollback();
          throw error;
      }
  }
};