'use strict';
const ethers = require('ethers');
const BigNumber = ethers.BigNumber;
const { TransactionReceipt, TransactionEvent, TokenTransfer, TokenTransferEvent, TokenBalanceChange, TokenBalanceChangeEvent } = require('../models');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const contracts = {};
    let receipts;
    let offset = 0, limit = parseInt(process.env.MAX_NUMBER_TO_INSERT || 1);
    do {
      receipts = await TransactionReceipt.findAll({
        include: 'transaction',
        order: [['id', 'ASC']],
        offset, limit
      });
      const events = [];
      for (let i = 0; i < receipts.length; i++) {
        const receipt = receipts[i];
        const gasPrice = receipt.raw.effectiveGasPrice || receipt.raw.gasPrice;
        const transactionFee = BigNumber.from(receipt.gasUsed).mul(BigNumber.from(gasPrice))

        events.push({
          workspaceId: receipt.workspaceId,
          transactionId: receipt.transactionId,
          blockNumber: receipt.blockNumber,
          timestamp: receipt.transaction.timestamp,
          transactionFee: transactionFee.toString(),
          gasPrice: BigNumber.from(gasPrice).toString(),
          gasUsed: BigNumber.from(receipt.gasUsed).toString(),
          from: receipt.from,
          to: receipt.to
        });
      }
      await TransactionEvent.bulkCreate(events);
      console.log(`${events.length} transaction events inserted.`);
      offset += limit;
    } while (receipts.length > 0)

    let transfers;
    offset = 0;
    do {
      transfers = await TokenTransfer.findAll({
        include: 'transaction',
        order: [['id', 'ASC']],
        offset, limit
      });
      const events = [];

      for (let i = 0; i < transfers.length; i++) {
        const transfer = transfers[i];
        let contract;
        if (!contracts[transfer.token])
          contracts[transfer.token] = await transfer.getContract();
        contract = contracts[transfer.token];
        events.push({
          workspaceId: transfer.workspaceId,
          tokenTransferId: transfer.id,
          blockNumber: transfer.transaction.blockNumber,
          timestamp: transfer.transaction.timestamp,
          amount: BigNumber.from(transfer.amount).toString(),
          token: transfer.token,
          tokenType: contract.patterns[0],
          src: transfer.src,
          dst: transfer.dst
        });
      }
      await TokenTransferEvent.bulkCreate(events);
      console.log(`${events.length} transfer events inserted.`);
      offset += limit;
    } while (transfers.length > 0)

    let balances;
    offset = 0;
    do {
      balances = await TokenBalanceChange.findAll({
        include: 'transaction',
        order: [['id', 'ASC']],
        offset, limit
      });
      const events = [];
      for (let i = 0; i < balances.length; i++) {
        const balance = balances[i];
        let contract;
        if (!contracts[balance.token])
          contracts[balance.token] = await balance.getContract();
        contract = contracts[balance.token];
        events.push({
          workspaceId: balance.workspaceId,
          tokenBalanceChangeId: balance.id,
          blockNumber: balance.transaction.blockNumber,
          timestamp: balance.transaction.timestamp,
          token: balance.token,
          address: balance.address,
          currentBalance: BigNumber.from(balance.currentBalance).toString(),
          tokenType: contract.patterns[0]
        });
      }
      await TokenBalanceChangeEvent.bulkCreate(events);
      console.log(`${events.length} balance change events inserted.`);
      offset += limit;
    } while (balances.length > 0)
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
};
