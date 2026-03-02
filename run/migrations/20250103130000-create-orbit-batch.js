'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('orbit_batches', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            workspaceId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'workspaces',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            
            // Batch Identification
            batchSequenceNumber: {
                type: Sequelize.BIGINT,
                allowNull: false,
                comment: 'Sequential batch number from sequencer inbox'
            },
            batchHash: {
                type: Sequelize.STRING(66),
                allowNull: true,
                comment: 'Hash of the batch data'
            },
            
            // Parent Chain Information
            parentChainBlockNumber: {
                type: Sequelize.BIGINT,
                allowNull: false,
                comment: 'Block number on parent chain where batch was posted'
            },
            parentChainTxHash: {
                type: Sequelize.STRING(66),
                allowNull: false,
                comment: 'Transaction hash of batch posting on parent chain'
            },
            parentChainTxIndex: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Transaction index in parent chain block'
            },
            
            // Batch Content
            transactionCount: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Number of transactions in this batch'
            },
            batchDataLocation: {
                type: Sequelize.ENUM('onchain', 'das', 'ipfs'),
                allowNull: false,
                defaultValue: 'onchain',
                comment: 'Where the batch data is stored'
            },
            batchDataHash: {
                type: Sequelize.STRING(66),
                allowNull: true,
                comment: 'Hash of the complete batch data'
            },
            batchSize: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Size of batch data in bytes'
            },
            
            // Timing Information
            postedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                comment: 'When the batch was posted to parent chain'
            },
            firstTxTimestamp: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Timestamp of first transaction in batch'
            },
            lastTxTimestamp: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Timestamp of last transaction in batch'
            },
            
            // Confirmation Status
            confirmationStatus: {
                type: Sequelize.ENUM('pending', 'confirmed', 'challenged', 'finalized'),
                allowNull: false,
                defaultValue: 'pending',
                comment: 'Current confirmation status of the batch'
            },
            confirmedAt: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'When the batch was confirmed'
            },
            finalizedAt: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'When the batch was finalized'
            },
            
            // Arbitrum Specific Fields
            beforeAcc: {
                type: Sequelize.STRING(66),
                allowNull: true,
                comment: 'Accumulator before this batch'
            },
            afterAcc: {
                type: Sequelize.STRING(66),
                allowNull: true,
                comment: 'Accumulator after this batch'
            },
            delayedAcc: {
                type: Sequelize.STRING(66),
                allowNull: true,
                comment: 'Delayed accumulator'
            },
            
            // Gas and Economics
            l1GasUsed: {
                type: Sequelize.BIGINT,
                allowNull: true,
                comment: 'Gas used on L1 for posting this batch'
            },
            l1GasPrice: {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'Gas price on L1 when batch was posted'
            },
            l1Cost: {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'Total L1 cost for posting this batch'
            },
            
            // Additional Metadata
            metadata: {
                type: Sequelize.JSONB,
                allowNull: true,
                comment: 'Additional batch metadata and derived information'
            },
            
            // Timestamps
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });

        // Add indexes for performance
        await queryInterface.addIndex('orbit_batches', ['workspaceId'], {
            name: 'orbit_batches_workspace_id_idx'
        });
        
        await queryInterface.addIndex('orbit_batches', ['workspaceId', 'batchSequenceNumber'], {
            unique: true,
            name: 'orbit_batches_workspace_sequence_unique'
        });
        
        await queryInterface.addIndex('orbit_batches', ['parentChainBlockNumber'], {
            name: 'orbit_batches_parent_chain_block_idx'
        });
        
        await queryInterface.addIndex('orbit_batches', ['parentChainTxHash'], {
            name: 'orbit_batches_parent_chain_tx_idx'
        });
        
        await queryInterface.addIndex('orbit_batches', ['postedAt'], {
            name: 'orbit_batches_posted_at_idx'
        });
        
        await queryInterface.addIndex('orbit_batches', ['confirmationStatus'], {
            name: 'orbit_batches_confirmation_status_idx'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('orbit_batches');
    }
};