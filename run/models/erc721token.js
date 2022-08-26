'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Erc721Token extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Erc721Token.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      Erc721Token.belongsTo(models.Contract, { foreignKey: 'contractId', as: 'contract' });
    }
  }
  Erc721Token.init({
    attributes: {
        type: DataTypes.VIRTUAL,
        get() {
            if (!this.metadata.attributes || typeof this.metadata.attributes !== 'object')
                return [];

            const properties = this.metadata.attributes.filter(metadata => {
                return metadata.value && typeof metadata.value == 'string';
            });
            const levels = this.metadata.attributes.filter(metadata => {
                return metadata.value && typeof metadata.value == 'number';
            });
            const boosts = this.metadata.attributes.filter(metadata => {
                return metadata.display_type &&
                    metadata.value &&
                    typeof metadata.value == 'number' &&
                    ['boost_number', 'boost_percentage'].indexOf(metadata.display_type);
            });
            const stats = this.metadata.attributes.filter(metadata => {
                return metadata.display_type &&
                    metadata.value &&
                    typeof metadata.value == 'number' &&
                    metadata.display_type == 'number';
            });
            const dates = this.metadata.attributes.filter(metadata => {
                return metadata.display_type &&
                    metadata.display_type == 'date';
            });

            return { properties, levels, boosts, stats, dates };
        }
    },
    workspaceId: DataTypes.INTEGER,
    contractId: DataTypes.INTEGER,
    owner: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('owner', value.toLowerCase());
        }
    },
    URI: DataTypes.STRING,
    tokenId: DataTypes.STRING,
    metadata: DataTypes.JSONB
  }, {
    sequelize,
    modelName: 'Erc721Token',
    tableName: 'erc_721_tokens'
  });
  return Erc721Token;
};