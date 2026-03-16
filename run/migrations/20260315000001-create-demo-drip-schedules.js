/**
 * @fileoverview Creates demo_drip_schedules table for database-driven email drip sequence.
 * Each row represents one scheduled email for one demo explorer.
 * @module migrations/20260315000001-create-demo-drip-schedules
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('demo_drip_schedules', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      explorerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'explorers', key: 'id' },
        onDelete: 'CASCADE'
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      step: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      sendAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      sentAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      skipped: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('demo_drip_schedules', ['sendAt', 'sentAt', 'skipped'], {
      name: 'idx_drip_schedules_pending'
    });
    await queryInterface.addIndex('demo_drip_schedules', ['explorerId', 'step'], {
      name: 'idx_drip_schedules_explorer_step',
      unique: true
    });
    await queryInterface.addIndex('demo_drip_schedules', ['email'], {
      name: 'idx_drip_schedules_email'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('demo_drip_schedules');
  }
};
