'use strict';
const {
  Model
} = require('sequelize');
const moment = require('moment');
const { encrypt, decrypt } = require('../lib/crypto');
const { sanitize } = require('../lib/utils');
module.exports = (sequelize, DataTypes) => {
  class ExplorerFaucet extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ExplorerFaucet.belongsTo(models.Explorer, { foreignKey: 'explorerId', as: 'explorer' });
      ExplorerFaucet.hasMany(models.FaucetDrip, { foreignKey: 'explorerFaucetId', as: 'drips' });
    }

    async safeCreateDrip(address, amount, transactionHash) {
      if (!address || !amount || !transactionHash)
        throw new Error('Missing parameter');

      return this.createDrip({ address, amount, transactionHash });
    }

    async canReceiveTokens(address) {
      const [latestDrip] = await this.getDrips({
        where: { address: address.toLowerCase() },
        order: [['id', 'DESC']],
        limit: 1
      });

      return !latestDrip || moment().diff(moment(latestDrip.createdAt), 'minutes') > this.interval;
    }

    activate() {
      return this.update({ active: true });
    }

    deactivate() {
      return this.update({ active: false });
    }

    safeUpdate(amount, interval) {
      const params = sanitize({ amount, interval });

      if (!Object.keys(params).length)
          return this;

      return this.update(params);
    }
  }
  ExplorerFaucet.init({
    explorerId: DataTypes.INTEGER,
    address: {
      type: DataTypes.STRING,
      set(value) {
          this.setDataValue('address', value.toLowerCase());
      }
    },
    privateKey: {
      type: DataTypes.STRING,
      set(value) {
        this.setDataValue('privateKey', encrypt(value));
      },
      get() {
        return decrypt(this.getDataValue('privateKey')).slice(0, 66);
      }
    },
    amount: DataTypes.FLOAT,
    interval: {
      type: DataTypes.INTEGER,
      set(value) {
        this.setDataValue('interval', parseFloat(value) * 60);
      },
      get() {
        return parseFloat(this.getDataValue('interval')) / 60;
      }
    },
    active: DataTypes.BOOLEAN,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'ExplorerFaucet',
    tableName: 'explorer_faucets'
  });
  return ExplorerFaucet;
};