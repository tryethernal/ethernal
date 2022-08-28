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

    getTokenTransfers() {
        return sequelize.models.TokenTransfer.findAll({
            where: {
                workspaceId: this.workspaceId,
                '$contract.id$': { [Op.eq]: this.contractId }
            },
            order: [
                ['id', 'desc']
            ],
            include: [
                {
                    model: sequelize.models.Contract,
                    attributes: ['id', 'tokenName', 'tokenDecimals', 'tokenSymbol', 'name', 'patterns'],
                    as: 'contract'
                },
                {
                    model: sequelize.models.Transaction,
                    attributes: ['hash', 'timestamp'],
                    as: 'transaction'
                }
            ],
            attributes: ['id', 'amount', 'dst', 'src', 'token', 'tokenId']
        });
    }
  }
  Erc721Token.init({
    attributes: {
        type: DataTypes.VIRTUAL,
        get() {
            if (!this.metadata || !this.metadata.attributes || typeof this.metadata.attributes !== 'object')
                return {
                    name: `#${this.tokenId}`,
                    image_data: null,
                    background_color: null,
                    description: null,
                    external_url: null,
                    properties: [],
                    levels: [],
                    boosts: [],
                    stats: [],
                    dates: []
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
    URI: DataTypes.STRING,
    tokenId: DataTypes.INTEGER,
    metadata: DataTypes.JSONB
  }, {
    sequelize,
    modelName: 'Erc721Token',
    tableName: 'erc_721_tokens'
  });
  return Erc721Token;
};