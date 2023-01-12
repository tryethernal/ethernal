'use strict';
const { getTokenTransfer } = require('../lib/abi');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up (queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            const [transaction_logs] = await queryInterface.sequelize.query(`
                SELECT tr."transactionId" AS "transactionId", tl.* FROM transaction_logs tl
                LEFT JOIN transaction_receipts tr ON tr.id = tl."transactionReceiptId;
            `);

            await queryInterface.sequelize.query(`
                ALTER TABLE token_balance_changes
                DROP CONSTRAINT "token_balance_changes_tokenTransferId_fkey";
            `, { transaction });

            // Drop token_transfers_transaction_logs_transactionLogId_idx
            await queryInterface.sequelize.query(`
                DROP INDEX "token_transfers_transaction_logs_transactionLogId_idx";
            `, { transaction });

            // Drop token_transfers_workspaceId_idx
            await queryInterface.sequelize.query(`
                DROP INDEX "token_transfers_workspaceId_idx";
            `, { transaction });

            // Drop unique_dst_src_token_transactionid_tokenid_token_transfers
            await queryInterface.sequelize.query(`
                ALTER TABLE token_transfers
                DROP CONSTRAINT "unique_dst_src_token_transactionid_tokenid_token_transfers";
            `, { transaction });

            // Drop token_transfers_pkey
            await queryInterface.sequelize.query(`
                ALTER TABLE token_transfers
                DROP CONSTRAINT "token_transfers_pkey";
            `, { transaction });

            // Drop token_transfers_transactionId_fkey
            await queryInterface.sequelize.query(`
                ALTER TABLE token_transfers
                DROP CONSTRAINT "token_transfers_transactionId_fkey";
            `, { transaction });

            // Drop token_transfers_workspaceId_fkey
            await queryInterface.sequelize.query(`
                ALTER TABLE token_transfers
                DROP CONSTRAINT "token_transfers_workspaceId_fkey";
            `, { transaction });

            // Drop token_transfers_workspaceId_fkey1
            await queryInterface.sequelize.query(`
                ALTER TABLE token_transfers
                DROP CONSTRAINT "token_transfers_workspaceId_fkey1";
            `, { transaction });

            // Dop token_transfers_transactionLogId_fkey
            await queryInterface.sequelize.query(`
                ALTER TABLE token_transfers
                DROP CONSTRAINT "token_transfers_transactionLogId_fkey";
            `, { transaction });

            await queryInterface.sequelize.query(`
                TRUNCATE token_balance_changes;
            `, { transaction });

            await queryInterface.sequelize.query(`
                TRUNCATE token_transfers;
            `, { transaction });

            let token_transfer_inserts = [];
            const BATCH_SIZE = 50000;
            for (let i = 0; i < transaction_logs.length; i += BATCH_SIZE) {
                for (let j = i; j < Math.min(i + BATCH_SIZE, transaction_logs.length); j++) {
                    const tl = transaction_logs[j];
                    const transfer = getTokenTransfer(tl);
                    if (transfer)
                        token_transfer_inserts.push(`('${transfer.amount}', '${transfer.dst}', '${transfer.src}', '${transfer.token}', ${tl.transactionId}, NOW(), NOW(), ${tl.workspaceId}, ${transfer.tokenId}, ${tl.id})`);
                }
                if (token_transfer_inserts.length > 0) {
                    await queryInterface.sequelize.query(`
                        INSERT INTO token_transfers(amount, dst, src, token, "transactionId", "createdAt", "updatedAt", "workspaceId", "tokenId", "transactionLogId")
                        VALUES ${token_transfer_inserts.join(',')};
                    `, { transaction });
                    token_transfer_inserts = [];
                }
            };

            // Create token_transfers_pkey
            await queryInterface.sequelize.query(`
                ALTER TABLE token_transfers
                ADD CONSTRAINT "token_transfers_pkey"
                PRIMARY KEY(id);
            `, { transaction });

            // Create token_transfers_transactionId_fkey
            await queryInterface.sequelize.query(`
                ALTER TABLE token_transfers
                ADD CONSTRAINT "token_transfers_transactionId_fkey"
                FOREIGN KEY ("transactionId")
                REFERENCES transactions(id) ON DELETE CASCADE;
            `, { transaction });

            // Create token_transfers_transactionLogId_fkey
            await queryInterface.sequelize.query(`
                ALTER TABLE token_transfers
                ADD CONSTRAINT "token_transfers_transactionLogId_fkey"
                FOREIGN KEY ("transactionLogId")
                REFERENCES transaction_logs(id) ON DELETE CASCADE;
            `, { transaction });

            // Create token_transfers_workspaceId_fkey
            await queryInterface.sequelize.query(`
                ALTER TABLE token_transfers
                ADD CONSTRAINT "token_transfers_workspaceId_fkey"
                FOREIGN KEY ("workspaceId")
                REFERENCES workspaces(id) ON DELETE CASCADE;
            `, { transaction });

            // Create token_transfers_workspaceId_fkey1
            await queryInterface.sequelize.query(`
                ALTER TABLE token_transfers
                ADD CONSTRAINT "token_transfers_workspaceId_fkey1"
                FOREIGN KEY ("workspaceId")
                REFERENCES workspaces(id) ON DELETE CASCADE;
            `, { transaction });

            // Create unique_dst_src_token_transactionid_tokenid_token_transfers
            await queryInterface.sequelize.query(`
                ALTER TABLE token_transfers
                ADD CONSTRAINT "unique_dst_src_token_transactionid_tokenid_token_transfers"
                UNIQUE (dst, src, token, "transactionId", "tokenId");
            `, { transaction });

            // Create token_transfers_transaction_logs_transactionLogId_idx
            await queryInterface.sequelize.query(`
                CREATE INDEX "token_transfers_transaction_logs_transactionLogId_idx"
                ON token_transfers("transactionLogId");
            `, { transaction });

            // Create token_transfers_workspaceId_idx
            await queryInterface.sequelize.query(`
                CREATE INDEX "token_transfers_workspaceId_idx"
                ON token_transfers("workspaceId");
            `, { transaction });

            // Create token_balance_changes_tokenTransferId_fkey 
            await queryInterface.sequelize.query(`
                ALTER TABLE token_balance_changes
                ADD CONSTRAINT "token_balance_changes_tokenTransferId_fkey"
                FOREIGN KEY ("tokenTransferId")
                REFERENCES token_transfers (id);
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
