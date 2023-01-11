'use strict';
const { getTokenTransfer } = require('../lib/abi');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up (queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.sequelize.query(`
                ALTER TABLE token_balance_changes
                DROP CONSTRAINT "token_balance_changes_tokenTransferId_fkey";
            `, { transaction });

            await queryInterface.sequelize.query(`
                ALTER TABLE token_transfers
                DROP CONSTRAINT "token_transfers_pkey";
            `, { transaction });

            await queryInterface.sequelize.query(`
                TRUNCATE token_balance_changes;
            `, { transaction });

            await queryInterface.sequelize.query(`
                TRUNCATE token_transfers;
            `, { transaction });

            const [transaction_logs] = await queryInterface.sequelize.query(`
                SELECT tr."transactionId" AS "transactionId", tl.* FROM transaction_logs tl
                LEFT JOIN transaction_receipts tr ON tr.id = tl."transactionReceiptId"
            `);

            const token_transfer_inserts = [];
            transaction_logs.forEach(tl => {
                const transfer = getTokenTransfer(tl);
                if (transfer)
                    token_transfer_inserts.push(`('${transfer.amount}', '${transfer.dst}', '${transfer.src}', '${transfer.token}', ${tl.transactionId}, NOW(), NOW(), ${tl.workspaceId}, ${transfer.tokenId}, ${tl.id})`);
            });

            await queryInterface.sequelize.query(`
                INSERT INTO token_transfers(amount, dst, src, token, "transactionId", "createdAt", "updatedAt", "workspaceId", "tokenId", "transactionLogId")
                VALUES ${token_transfer_inserts.join(',')};
            `, { transaction });

            await queryInterface.sequelize.query(`
                ALTER TABLE token_balance_changes
                ADD CONSTRAINT "token_balance_changes_tokenTransferId_fkey" FOREIGN KEY ("tokenTransferId") REFERENCES token_transfers (id);
            `, { transaction });
            
            await transaction.commit();
        } catch(error) {
            console.log(error)
            await transaction.rollback();
            throw error;
        }
    },

    async down (queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            
            await transaction.commit();
        } catch(error) {
            console.log(error)
            await transaction.rollback();
            throw error;
        }
    }
};
