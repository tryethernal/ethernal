'use strict';
const { Model } = require('sequelize');

/**
 * @fileoverview Prospect model — represents an outbound sales prospect
 * (pre-launch L2 team) detected by the signal detection pipeline.
 * @module models/Prospect
 */

const VALID_STATUSES = ['detected', 'draft_ready', 'approved', 'sent', 'replied', 'no_reply', 'rejected', 'snoozed', 'discovery_only'];
const VALID_CHAIN_TYPES = ['op_stack', 'orbit', 'zk_evm', 'other_evm'];
const VALID_LAUNCH_STATUSES = ['announced', 'testnet', 'pre_mainnet', 'mainnet'];
const VALID_LEAD_TYPES = ['cold_lead', 'warm_lead'];
const VALID_SIGNAL_SOURCES = ['l2beat', 'funding', 'github', 'raas'];

module.exports = (sequelize, DataTypes) => {
    class Prospect extends Model {
        static associate(models) {
            Prospect.belongsTo(models.DemoProfile, { foreignKey: 'demoProfileId', as: 'demoProfile' });
            Prospect.hasMany(models.ProspectEvent, { foreignKey: 'prospectId', as: 'events' });
        }

        /**
         * Log an event for this prospect.
         * @param {string} event - Event name
         * @param {Object} [metadata] - Optional event metadata
         * @returns {Promise<ProspectEvent>}
         */
        async logEvent(event, metadata = null) {
            const ProspectEvent = sequelize.models.ProspectEvent;
            return ProspectEvent.create({ prospectId: this.id, event, metadata });
        }

        /** @returns {boolean} True if contact email is missing */
        get isMissingContact() {
            return !this.contactEmail;
        }
    }

    Prospect.init({
        domain: DataTypes.STRING,
        companyName: DataTypes.STRING,
        chainName: DataTypes.STRING,
        chainType: {
            type: DataTypes.STRING,
            validate: { isIn: [VALID_CHAIN_TYPES] }
        },
        launchStatus: {
            type: DataTypes.STRING,
            validate: { isIn: [VALID_LAUNCH_STATUSES] }
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'detected',
            validate: { isIn: [VALID_STATUSES] }
        },
        leadType: {
            type: DataTypes.STRING,
            validate: { isIn: [VALID_LEAD_TYPES] }
        },
        signalSource: {
            type: DataTypes.STRING,
            validate: { isIn: [VALID_SIGNAL_SOURCES] }
        },
        signalData: DataTypes.JSONB,
        confidenceScore: { type: DataTypes.FLOAT, defaultValue: 0 },
        research: DataTypes.TEXT,
        enrichment: DataTypes.JSONB,
        contactName: DataTypes.STRING,
        contactEmail: DataTypes.STRING,
        contactLinkedin: DataTypes.STRING,
        emailSubject: DataTypes.STRING,
        emailBody: DataTypes.TEXT,
        followUpCount: { type: DataTypes.INTEGER, defaultValue: 0 },
        sentAt: DataTypes.DATE,
        openedAt: DataTypes.DATE,
        repliedAt: DataTypes.DATE,
        demoProfileId: DataTypes.INTEGER
    }, {
        sequelize,
        modelName: 'Prospect',
        tableName: 'prospects'
    });

    Prospect.VALID_STATUSES = VALID_STATUSES;
    Prospect.VALID_CHAIN_TYPES = VALID_CHAIN_TYPES;
    Prospect.VALID_LAUNCH_STATUSES = VALID_LAUNCH_STATUSES;
    Prospect.VALID_LEAD_TYPES = VALID_LEAD_TYPES;

    return Prospect;
};
