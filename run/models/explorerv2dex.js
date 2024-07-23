'use strict';
const {
  Model
} = require('sequelize');
const { Token, CurrencyAmount, Percent } = require('@uniswap/sdk-core');
const { Pair, Trade } = require('@uniswap/v2-sdk');
const { sanitize } = require('../lib/utils');
const { enqueue } = require('../lib/queue');
const IUniswapV2Pair = require('../lib/abis/IUniswapV2Pair.json');
const NATIVE_TOKEN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

module.exports = (sequelize, DataTypes) => {
  class ExplorerV2Dex extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ExplorerV2Dex.belongsTo(models.Explorer, { foreignKey: 'explorerId', as: 'explorer' });
      ExplorerV2Dex.hasMany(models.V2DexPair, { foreignKey: 'explorerV2DexId', as: 'pairs' });
      ExplorerV2Dex.belongsTo(models.Contract, { foreignKey: 'wrappedNativeTokenContractId', as: 'wrappedNativeTokenContract' });
    }

    async safeDestroy() {
      return sequelize.transaction(async transaction => {
        const pairs = await this.getPairs();
        for (const pair of pairs) {
          await pair.safeDestroy(transaction);
        }
        return this.destroy({ transaction });
      });
    }

    async getAllTokens() {
      const pairs = await this.getPairs({ include: ['token0', 'token1' ]});

      const allTokens = pairs
        .map(pair => {
          return [
            {
              address: pair.token0.address,
              tokenName: pair.token0.tokenName,
              tokenSymbol: pair.token0.tokenSymbol,
              tokenDecimals: pair.token0.tokenDecimals
            },
            {
              address: pair.token1.address,
              tokenName: pair.token1.tokenName,
              tokenSymbol: pair.token1.tokenSymbol,
              tokenDecimals: pair.token1.tokenDecimals
            }
          ]
        })
        .flat()
        .filter(t => t.tokenSymbol && t.tokenName && t.tokenDecimals);

      return [...new Map(allTokens.map(obj => [JSON.stringify(obj), obj])).values()];
    }

    async getQuote(token0, token1, amount, direction = 'exactIn', slippageToleranceInBps = 50) {
      if (direction != 'exactIn' && direction != 'exactOut')
        throw new Error('Invalid direction parameter');

      const dexPairs = await this.getPairs({
        include: ['token0', 'token1']
      });

      const explorer = await this.getExplorer();
      const chainId = parseInt(explorer.chainId);

      const pairs = [];
      for (let i = 0; i < dexPairs.length; i++) {
        const dexPair = dexPairs[i];
        const reserves = await dexPair.getLatestReserves();
        if (!reserves || !dexPair.token0.tokenSymbol || !dexPair.token0.tokenName || dexPair.token0.tokenDecimals === null || dexPair.token1.tokenSymbol === null || dexPair.token1.tokenName === null || dexPair.token1.tokenDecimals === null)
          continue;

        const token0 = new Token(chainId, dexPair.token0.address, dexPair.token0.tokenDecimals, dexPair.token0.tokenSymbol, dexPair.token0.tokenName);
        const token1 = new Token(chainId, dexPair.token1.address, dexPair.token1.tokenDecimals, dexPair.token1.tokenSymbol, dexPair.token1.tokenName);
        pairs.push(new Pair(
          CurrencyAmount.fromRawAmount(token0, reserves.reserve0),
          CurrencyAmount.fromRawAmount(token1, reserves.reserve1),
        ));
      }

      const token0Contract = token0.toLowerCase() === NATIVE_TOKEN_ADDRESS ?
        await this.getWrappedNativeTokenContract() :
        await sequelize.models.Contract.findOne({
          where: {
              workspaceId: explorer.workspaceId,
              address: token0.toLowerCase()
          }
        });

      if (!token0Contract)
        return {};

      const token1Contract = token1.toLowerCase() === NATIVE_TOKEN_ADDRESS ?
        await this.getWrappedNativeTokenContract() :
        await sequelize.models.Contract.findOne({
          where: {
              workspaceId: explorer.workspaceId,
              address: token1.toLowerCase()
          }
        });

      if (!token1Contract)
        return {};

      const computeLpFee = (trade) => {
        const BASE_FEE = new Percent('30', '10000')
        const ONE_HUNDRED_PERCENT = new Percent('10000', '10000');
        const INPUT_FRACTION_AFTER_FEE = ONE_HUNDRED_PERCENT.subtract(BASE_FEE);
        return ONE_HUNDRED_PERCENT.subtract(
          trade.route.pairs.reduce(
            (currentFee) => currentFee.multiply(INPUT_FRACTION_AFTER_FEE),
            ONE_HUNDRED_PERCENT
          )
        );
      };

      const computePriceImpact = (trade) => {
        return trade.priceImpact.subtract(computeLpFee(trade));
      }

      const allTrades = [];
      if (direction == 'exactOut') {
        [1, 2, 3].forEach(maxHops => {
          const currencyIn = new Token(chainId, token0Contract.address, token0Contract.tokenDecimals, token0Contract.tokenSymbol, token0Contract.tokenName);
          const nextAmountOut = CurrencyAmount.fromRawAmount(
            new Token(chainId, token1Contract.address, token1Contract.tokenDecimals, token1Contract.tokenSymbol, token1Contract.tokenName),
            amount
          );
          allTrades.push(...Trade.bestTradeExactOut(pairs, currencyIn, nextAmountOut, { maxHops, maxNumResults: 3 }));
        });
      }
      else {
        [1, 2, 3].forEach(maxHops => {
          const nextAmountIn = CurrencyAmount.fromRawAmount(
            new Token(chainId, token0Contract.address, token0Contract.tokenDecimals, token0Contract.tokenSymbol, token0Contract.tokenName),
            amount
          );
          const currencyOut = new Token(chainId, token1Contract.address, token1Contract.tokenDecimals, token1Contract.tokenSymbol, token1Contract.tokenName);
          allTrades.push(...Trade.bestTradeExactIn(pairs, nextAmountIn, currencyOut, { maxHops, maxNumResults: 3 }));
        });
      }

      const trades = allTrades.filter(t => {
        return computePriceImpact(t).lessThan(1);
      });

      if (!trades.length)
        return {};

      let trade = trades[0];

      let currentPriceImpact = computePriceImpact(trade);
      let currentLpFee = computeLpFee(trade);

      for (let i = 1; i < trades.length; i++) {
        const newPriceImpact = computePriceImpact(trades[i]);
        const newLpFee = computeLpFee(trades[i]);
        if (newPriceImpact.lessThan(currentPriceImpact)) {
          currentPriceImpact = newPriceImpact;
          currentLpFee = newLpFee;
          trade = trades[i];
        }
      }

      const slippageTolerance = new Percent(slippageToleranceInBps, '10000');

      return {
          lpFee: trade.inputAmount.multiply(currentLpFee).toSignificant(2),
          inputAmount: trade.inputAmount.toSignificant(6),
          outputAmount: trade.outputAmount.toSignificant(6),
          minimumAmountOut: trade.minimumAmountOut(slippageTolerance).toSignificant(4),
          maximumAmountIn: trade.maximumAmountIn(slippageTolerance).toSignificant(4),
          priceImpact: currentPriceImpact.toSignificant(2),
          executionPrice: trade.executionPrice.toSignificant(5),
          invertedExecutionPrice: trade.executionPrice.invert().toSignificant(5),
          path: trade.route.path
      };
    }

    async safeCreatePair(token0, token1, pair) {
      if (!token0 || !token1 || !pair)
        throw new Error('Missing parameter');

      const existingPair = await sequelize.models.V2DexPair.findOne({
        where: {
          explorerV2DexId: this.id,
          '$token0.address$': token0.toLowerCase(),
          '$token1.address$': token1.toLowerCase()
        },
        include: ['token0', 'token1']
      });

      if (existingPair)
        return null;

      const explorer = await this.getExplorer();

      let [{ id: token0ContractId }] = await sequelize.models.Contract.findOrCreate({
        where: {
            workspaceId: explorer.workspaceId,
            address: token0.toLowerCase()
        }
      });
      let [{ id: token1ContractId }] = await sequelize.models.Contract.findOrCreate({
          where: {
              workspaceId: explorer.workspaceId,
              address: token1.toLowerCase()
          }
      });
      let [pairContract] = await sequelize.models.Contract.findOrCreate({
        where: {
            workspaceId: explorer.workspaceId,
            address: pair.toLowerCase()
        }
      });
      const pairContractProperties = sanitize({
        abi: pairContract.abi ? pairContract.abi : IUniswapV2Pair,
        name: pairContract.name ? pairContract.name : 'UniswapV2Pair'
      });
      await pairContract.update(pairContractProperties);

      return this.createPair({ token0ContractId, token1ContractId, pairContractId: pairContract.id });
    }

    async getPairsWithLatestReserves(page = 1, itemsPerPage = 10, order = 'DESC') {
      const offset = (page - 1) * itemsPerPage;
      const validOrder = ['ASC', 'DESC'].includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';
      const { count, rows: pairs } = await sequelize.models.V2DexPair.findAndCountAll({
        where: {
          explorerV2DexId: this.id
        },
        attributes: ['id', 'explorerV2DexId', 'token0ContractId', 'token1ContractId', 'pairContractId',
          [sequelize.literal('(SELECT COALESCE((SELECT (reserve0::numeric + reserve1::numeric) FROM v2_dex_pool_reserves WHERE v2_dex_pool_reserves."v2DexPairId" = "V2DexPair".id ORDER BY timestamp DESC LIMIT 1), 0))'), 'reserveSum']
        ],
        include: [
          {
            model: sequelize.models.V2DexPoolReserve,
            as: 'poolReserves',
            order: [['timestamp', 'DESC']],
            limit: 1
          },
          {
            model: sequelize.models.Contract,
            as: 'token0',
            attributes: ['address', 'tokenName', 'tokenSymbol', 'tokenDecimals']
          },
          {
            model: sequelize.models.Contract,
            as: 'token1',
            attributes: ['address', 'tokenName', 'tokenSymbol', 'tokenDecimals']
          }
        ],
        order: [[sequelize.literal('"reserveSum"'), validOrder]],
        limit: itemsPerPage,
        offset: offset
      });

      return { count, pairs };
    }
  }
  ExplorerV2Dex.init({
    routerAddress: DataTypes.STRING,
    factoryAddress: DataTypes.STRING,
    wrappedNativeTokenContractId: DataTypes.INTEGER,
    explorerId: DataTypes.STRING,
    active: DataTypes.BOOLEAN,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    hooks: {
      afterCreate(dex, options) {
        const afterCreateFn = () => {
          return enqueue('processExplorerV2Dex', `processExplorerV2Dex-${dex.id}`, { explorerDexId: dex.id })
        };
        return options.transaction ? options.transaction.afterCommit(afterCreateFn) : afterCreateFn();
    },
    },
    sequelize,
    modelName: 'ExplorerV2Dex',
    tableName: 'explorer_v2_dexes'
  });
  return ExplorerV2Dex;
};