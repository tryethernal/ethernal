'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const Op = Sequelize.Op;
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
            if (!this.metadata)
                return {
                    ...token,
                    attributes: {
                        name: `#${token.tokenId}`,
                        image_data: null,
                        background_color: null,
                        description: null,
                        external_url: null,
                        properties: [],
                        levels: [],
                        boosts: [],
                        stats: [],
                        dates: []
                    }
                };

            const name = this.metadata.name || `#${this.tokenId}`;

            let image_data;
            if (this.metadata.image_data)
                image_data = this.metadata.image_data;
            else if (this.metadata.image) {
                const insertableImage = this.metadata.image.startsWith('ipfs://') ?
                    `https://ipfs.io/ipfs/${this.metadata.image.slice(7, this.metadata.image.length)}` :
                    this.metadata.image;

                image_data = `<img style="height: 100%; width: 100%; object-fit: cover" src="${insertableImage}" />`;
            }

            const properties = (this.metadata.attributes || []).filter(metadata => {
                return metadata.value &&
                    !metadata.display_type &&
                    typeof metadata.value == 'string';
            });

            const levels = (this.metadata.attributes || []).filter(metadata => {
                return metadata.value &&
                    !metadata.display_type &&
                    typeof metadata.value == 'number';
            });

            const boosts = (this.metadata.attributes || []).filter(metadata => {
                return metadata.display_type &&
                    metadata.value &&
                    typeof metadata.value == 'number' &&
                    ['boost_number', 'boost_percentage'].indexOf(metadata.display_type) > -1;
            });

            const stats = (this.metadata.attributes || []).filter(metadata => {
                return metadata.display_type &&
                    metadata.value &&
                    typeof metadata.value == 'number' &&
                    metadata.display_type == 'number';
            });

            const dates = (this.metadata.attributes || []).filter(metadata => {
                return metadata.display_type &&
                    metadata.display_type == 'date';
            });

            return { background_color: this.metadata.background_color, name, image_data, external_url: this.metadata.external_url, description: this.metadata.description, properties, levels, boosts, stats, dates };
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
    URI: DataTypes.TEXT,
    tokenId: DataTypes.STRING,
    metadata: DataTypes.JSONB
  }, {
    sequelize,
    modelName: 'Erc721Token',
    tableName: 'erc_721_tokens'
  });
  return Erc721Token;
};
