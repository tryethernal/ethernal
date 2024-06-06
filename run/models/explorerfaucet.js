'use strict';
const {
  Model,
  Sequelize,
  QueryTypes
} = require('sequelize');
const Op = Sequelize.Op;
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

    getTransactionHistory(page = 1, itemsPerPage = 10, order = 'desc', orderBy = 'createdAt') {
      const sanitizedOrder = ['asc', 'desc'].indexOf(order.toLowerCase()) > -1 ? order : 'desc';
      const sanitizedOrderBy = ['createdAt', 'amount'].indexOf(orderBy) > -1 ? orderBy : 'createdAt';

      return sequelize.models.FaucetDrip.findAndCountAll({
        where: { explorerFaucetId: this.id },
        offset: (page - 1) * itemsPerPage,
        limit: itemsPerPage,
        order: [[sanitizedOrderBy, sanitizedOrder]],
        attributes: ['address', 'amount', 'transactionHash', 'createdAt']
      })
    }

    async getTokenVolume(from, to) {
      if (!from || !to) throw new Error('Missing parameter');

      const explorer = await this.getExplorer({ include: 'workspace' });

      const [earliestBlock] = await explorer.workspace.getBlocks({
        where: {
            timestamp: { [Op.gt]: new Date(0) }
        },
        attributes: ['timestamp'],
        order: [['number', 'ASC']],
        limit: 1
      });

      if (!earliestBlock && +new Date(from) == 0)
          return [];

      const earliestTimestamp = +new Date(from) == 0 ? earliestBlock.timestamp : new Date(from);

      return sequelize.query(`
        WITH days AS (
          SELECT
            d::date AS day
          FROM generate_series(:from::date, :to::date, interval '1 day') d
        )
        SELECT
          days.day::timestamptz AS date,
          COALESCE(SUM(faucet_drips.amount), 0) AS amount
        FROM days
        LEFT JOIN faucet_drips
          ON date_trunc('day', faucet_drips."createdAt") = days.day
          AND faucet_drips."explorerFaucetId" = :faucetId
        GROUP BY days.day
        ORDER BY days.day ASC;
      `, {
          replacements: {
              from: new Date(earliestTimestamp),
              to,
              faucetId: this.id
          },
          type: QueryTypes.SELECT
      });
    }

    async getRequestVolume(from, to) {
      if (!from || !to) throw new Error('Missing parameter');

      const explorer = await this.getExplorer({ include: 'workspace' });

      const [earliestBlock] = await explorer.workspace.getBlocks({
        where: {
            timestamp: { [Op.gt]: new Date(0) }
        },
        attributes: ['timestamp'],
        order: [['number', 'ASC']],
        limit: 1
      });

      if (!earliestBlock && +new Date(from) == 0)
          return [];

      const earliestTimestamp = +new Date(from) == 0 ? earliestBlock.timestamp : new Date(from);

      return sequelize.query(`
        WITH days AS (
          SELECT
            d::date AS day
          FROM generate_series(:from::date, :to::date, interval '1 day') d
        )
        SELECT
          days.day::timestamptz AS date,
          COALESCE(COUNT(faucet_drips."createdAt"), 0) AS count
        FROM days
        LEFT JOIN faucet_drips
          ON date_trunc('day', faucet_drips."createdAt") = days.day
          AND faucet_drips."explorerFaucetId" = :faucetId
        GROUP BY days.day
        ORDER BY days.day ASC;
      `, {
          replacements: {
              from: new Date(earliestTimestamp),
              to,
              faucetId: this.id
          },
          type: QueryTypes.SELECT
      });
    }

    safeDestroy() {
      return sequelize.transaction(async transaction => {
        const drips = await this.getDrips();
        for (let i = 0; i < drips.length; i++)
          drips[i].destroy({ transaction });
        return this.destroy({ transaction });
      });
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

      const cooldown = latestDrip ? Math.max(this.interval * 60 - moment().diff(moment(latestDrip.createdAt), 'minutes'), 0) : 0;
      return { allowed: !latestDrip || !cooldown, cooldown };
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

      if (params['amount'] && isNaN(parseFloat(params['amount'])) || parseFloat(params['amount']) <= 0)
        throw new Error('Amount needs to be greater than 0.')
      if (params['interval'] && isNaN(parseFloat(params['interval'])) || parseFloat(params['interval']) <= 0)
        throw new Error('Interval needs to be greater than 0.')

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