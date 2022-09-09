'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Erc721Tokens extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Erc721Tokens.init({
    workspaceId: DataTypes.INTEGER,
    contractId: DataTypes.INTEGER,
    owner: DataTypes.STRING,
    URI: DataTypes.STRING,
    tokenId: DataTypes.INTEGER,
    metadata: DataTypes.JSONB
  }, {
    sequelize,
    modelName: 'Erc721Tokens',
  });
  return Erc721Tokens;
};
