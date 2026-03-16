/**
 * @fileoverview Adds deleteAfter timestamp to workspaces for grace period support.
 * When set, removeExpiredExplorers defers deletion until this timestamp.
 * @module migrations/20260315000002-add-delete-after-to-workspaces
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('workspaces', 'deleteAfter', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('workspaces', 'deleteAfter');
  }
};
