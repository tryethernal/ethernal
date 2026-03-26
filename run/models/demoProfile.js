'use strict';
const { Model } = require('sequelize');

/**
 * @fileoverview DemoProfile model — captures demo metadata and activity snapshots
 * before demo explorers are cleaned up. Used for prospect matching and personalization.
 * @module models/DemoProfile
 */
module.exports = (sequelize, DataTypes) => {
    class DemoProfile extends Model {
        static associate(models) {
            // No direct associations — demo profiles persist after explorer deletion
        }

        /**
         * Check if this demo had high activity.
         * Thresholds: >100 blocks OR >50 transactions OR >5 contracts.
         * @returns {boolean}
         */
        get isHighActivity() {
            return this.blockCount > 100 || this.transactionCount > 50 || this.contractCount > 5;
        }
    }

    DemoProfile.init({
        email: { type: DataTypes.STRING, allowNull: false },
        domain: DataTypes.STRING,
        rpcServer: DataTypes.STRING,
        chainName: DataTypes.STRING,
        networkId: DataTypes.STRING,
        blockCount: { type: DataTypes.INTEGER, defaultValue: 0 },
        transactionCount: { type: DataTypes.INTEGER, defaultValue: 0 },
        transferCount: { type: DataTypes.INTEGER, defaultValue: 0 },
        contractCount: { type: DataTypes.INTEGER, defaultValue: 0 },
        activeAddresses: { type: DataTypes.INTEGER, defaultValue: 0 },
        enrichment: DataTypes.JSONB,
        explorerCreatedAt: DataTypes.DATE,
        explorerDeletedAt: DataTypes.DATE
    }, {
        sequelize,
        modelName: 'DemoProfile',
        tableName: 'demo_profiles'
    });

    return DemoProfile;
};
