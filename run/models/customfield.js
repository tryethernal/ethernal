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
