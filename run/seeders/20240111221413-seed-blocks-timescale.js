'use strict';
const ethers = require('ethers');
const { stringify } = require('../lib/utils');
const BigNumber = ethers.BigNumber;
const { Transaction, TransactionReceipt, TransactionEvent, TokenTransfer, TokenTransferEvent, TokenBalanceChange, TokenBalanceChangeEvent } = require('../models');
const { getMaxNumberToInsert } = require('../lib/env');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const contracts = {};
    let receipts;
    let offset = 0, limit = getMaxNumberToInsert();
    do {

      receipts = await TransactionReceipt.findAll({
        include: [{
          model: Transaction,
          as: 'transaction',
        }],
        order: [['id', 'ASC']],
        offset, limit
      });

      const events = [];
      for (let i = 0; i < receipts.length; i++) {
        const receipt = receipts[i];
        const gasPrice = stringify(receipt.raw.effectiveGasPrice) || stringify(receipt.raw.gasPrice) || stringify(receipt.transaction.gasPrice);
        const transactionFee = BigNumber.from(receipt.gasUsed).mul(BigNumber.from(gasPrice))

        try {
          events.push({
            workspaceId: receipt.workspaceId,
            transactionId: receipt.transactionId,
            blockNumber: receipt.blockNumber,
            timestamp: receipt.transaction.timestamp,
            transactionFee: stringify(transactionFee),
            gasPrice: stringify(gasPrice),
            gasUsed: stringify(receipt.gasUsed),
            from: receipt.from,
            to: receipt.to
          });
        } catch(error) {
          console.log(gasPrice)
          console.log(receipt)
        }
      }
      await TransactionEvent.bulkCreate(events, { ignoreDuplicates: true });
      console.log(`${events.length} transaction events inserted.`);
      offset += limit;
    } while (receipts.length > 0)

    let transfers;
    offset = 0;
    do {
      transfers = await TokenTransfer.findAll({
        include: { model: Transaction, as: 'transaction', attributes: ['blockNumber', 'timestamp'] },
        attributes: ['token', 'id', 'workspaceId', 'amount', 'src', 'dst'],
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
          amount: stringify(transfer.amount),
          token: transfer.token,
          tokenType: contract ? contract.patterns[0] : null,
          src: transfer.src,
          dst: transfer.dst
        });
      }
      await TokenTransferEvent.bulkCreate(events, { ignoreDuplicates: true });
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
          currentBalance: stringify(balance.currentBalance),
          tokenType: contract ? contract.patterns[0] : null
        });
      }
      await TokenBalanceChangeEvent.bulkCreate(events, { ignoreDuplicates: true });
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
