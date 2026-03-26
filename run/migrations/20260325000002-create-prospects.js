'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('prospects', {
            id: { autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            domain: { type: Sequelize.STRING },
            companyName: { type: Sequelize.STRING },
            chainName: { type: Sequelize.STRING },
            chainType: { type: Sequelize.STRING },
            launchStatus: { type: Sequelize.STRING },
            status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'detected' },
            leadType: { type: Sequelize.STRING },
            signalSource: { type: Sequelize.STRING },
            signalData: { type: Sequelize.JSONB },
            confidenceScore: { type: Sequelize.FLOAT, defaultValue: 0 },
            research: { type: Sequelize.TEXT },
            enrichment: { type: Sequelize.JSONB },
            contactName: { type: Sequelize.STRING },
            contactEmail: { type: Sequelize.STRING },
            contactLinkedin: { type: Sequelize.STRING },
            emailSubject: { type: Sequelize.STRING },
            emailBody: { type: Sequelize.TEXT },
            followUpCount: { type: Sequelize.INTEGER, defaultValue: 0 },
            sentAt: { type: Sequelize.DATE },
            openedAt: { type: Sequelize.DATE },
            repliedAt: { type: Sequelize.DATE },
            demoProfileId: {
                type: Sequelize.INTEGER,
                references: { model: 'demo_profiles', key: 'id' },
                onDelete: 'SET NULL'
            },
            createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
            updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
        });

        await queryInterface.addIndex('prospects', ['domain'], {
            name: 'idx_prospects_domain',
            unique: true,
            where: { domain: { [Sequelize.Op.ne]: null } }
        });
        await queryInterface.addIndex('prospects', ['status'], {
            name: 'idx_prospects_status'
        });
        await queryInterface.addIndex('prospects', ['status', 'confidenceScore'], {
            name: 'idx_prospects_queue'
        });

        await queryInterface.createTable('prospect_events', {
            id: { autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            prospectId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'prospects', key: 'id' },
                onDelete: 'CASCADE'
            },
            event: { type: Sequelize.STRING, allowNull: false },
            metadata: { type: Sequelize.JSONB },
            createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
        });

        await queryInterface.addIndex('prospect_events', ['prospectId'], {
            name: 'idx_prospect_events_prospect'
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('prospect_events');
        await queryInterface.dropTable('prospects');
    }
};
