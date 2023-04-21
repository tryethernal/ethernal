'use strict';
const {
  Model
} = require('sequelize');
const { trigger } = require('../lib/pusher');
const moment = require('moment');

module.exports = (sequelize, DataTypes) => {
  class Block extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Block.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      Block.hasMany(models.Transaction, { foreignKey: 'blockId', as: 'transactions' });
    }

    async revertIfPartial() {
        if (this.state !== 'syncing')
            return;

        this.destroy();
    }
  }
  Block.init({
    baseFeePerGas: DataTypes.STRING,
    difficulty: DataTypes.STRING,
    extraData: DataTypes.TEXT,
    gasLimit: DataTypes.STRING,
    gasUsed: DataTypes.STRING,
    hash: DataTypes.STRING,
    miner: DataTypes.STRING,
    nonce: DataTypes.STRING,
    number: DataTypes.INTEGER,
    parentHash: DataTypes.STRING,
    timestamp: {
        type: DataTypes.DATE,
        set(value) {
            this.setDataValue('timestamp', moment.unix(value).format());
        }
    },
    transactionsCount: DataTypes.INTEGER,
    raw: DataTypes.JSON,
    workspaceId: DataTypes.INTEGER,
    state: DataTypes.ENUM('syncing', 'ready')
  }, {
    hooks: {
        async afterSave(block, options) {
            const afterSaveFn = async () => {
                trigger(`private-blocks;workspace=${block.workspaceId}`, 'new', { number: block.number });
                const integrityCheck = await sequelize.models.IntegrityCheck.findOne({
                    where: { workspaceId: block.workspaceId },
                    include: {
                        model: sequelize.models.Block,
                        as: 'block'
                    }
                });

                if (integrityCheck && block.number < integrityCheck.block.number) {
                    await integrityCheck.update({ blockId: block.id });
                }
            };

            if (options.transaction)
                return options.transaction.afterCommit(afterSaveFn);
            else
                return afterSaveFn();
        }
    },
    sequelize,
    modelName: 'Block',
    tableName: 'blocks'
  });
  return Block;
};