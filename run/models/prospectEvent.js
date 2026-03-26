'use strict';
const { Model } = require('sequelize');

/**
 * @fileoverview ProspectEvent model — event log for prospect lifecycle tracking.
 * @module models/ProspectEvent
 */
module.exports = (sequelize, DataTypes) => {
    class ProspectEvent extends Model {
        static associate(models) {
            ProspectEvent.belongsTo(models.Prospect, { foreignKey: 'prospectId', as: 'prospect' });
        }
    }

    ProspectEvent.init({
        prospectId: { type: DataTypes.INTEGER, allowNull: false },
        event: { type: DataTypes.STRING, allowNull: false },
        metadata: DataTypes.JSONB
    }, {
        sequelize,
        modelName: 'ProspectEvent',
        tableName: 'prospect_events',
        updatedAt: false
    });

    return ProspectEvent;
};
