/**
 * @fileoverview CustomField model - stores custom code/functions for workspaces.
 * Used for package imports and global function definitions.
 *
 * @module models/CustomField
 *
 * @property {number} id - Primary key
 * @property {number} workspaceId - Foreign key to workspace
 * @property {string} function - Custom function code
 * @property {string} location - Where used (global, package)
 */

'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CustomField extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CustomField.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
    }
  }
  CustomField.init({
    workspaceId: DataTypes.INTEGER,
    function: DataTypes.TEXT,
    location: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'CustomField',
    tableName: 'custom_fields',
  });
  return CustomField;
};
