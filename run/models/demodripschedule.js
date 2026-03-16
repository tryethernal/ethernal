/**
 * @fileoverview DemoDripSchedule model - tracks scheduled drip emails for demo explorers.
 * Each row is one email (step 1-6) with a pre-calculated sendAt timestamp.
 *
 * @module models/DemoDripSchedule
 *
 * @property {number} id - Primary key
 * @property {number} explorerId - FK to explorers table
 * @property {string} email - Recipient email address
 * @property {number} step - Email step number (1-6)
 * @property {Date} sendAt - When to send this email
 * @property {Date|null} sentAt - When it was actually sent (null = pending)
 * @property {boolean} skipped - Whether this email was skipped (user migrated or unsubscribed)
 */

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DemoDripSchedule extends Model {
    static associate(models) {
      DemoDripSchedule.belongsTo(models.Explorer, { foreignKey: 'explorerId', as: 'explorer' });
    }
  }

  DemoDripSchedule.init({
    explorerId: DataTypes.INTEGER,
    email: DataTypes.STRING,
    step: DataTypes.INTEGER,
    sendAt: DataTypes.DATE,
    sentAt: DataTypes.DATE,
    skipped: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'DemoDripSchedule',
    tableName: 'demo_drip_schedules'
  });

  return DemoDripSchedule;
};
