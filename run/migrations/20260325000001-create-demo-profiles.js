'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('demo_profiles', {
            id: { autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            email: { type: Sequelize.STRING, allowNull: false },
            domain: { type: Sequelize.STRING },
            rpcServer: { type: Sequelize.STRING },
            chainName: { type: Sequelize.STRING },
            networkId: { type: Sequelize.STRING },
            blockCount: { type: Sequelize.INTEGER, defaultValue: 0 },
            transactionCount: { type: Sequelize.INTEGER, defaultValue: 0 },
            transferCount: { type: Sequelize.INTEGER, defaultValue: 0 },
            contractCount: { type: Sequelize.INTEGER, defaultValue: 0 },
            activeAddresses: { type: Sequelize.INTEGER, defaultValue: 0 },
            enrichment: { type: Sequelize.JSONB },
            explorerCreatedAt: { type: Sequelize.DATE },
            explorerDeletedAt: { type: Sequelize.DATE },
            createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
            updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
        });

        await queryInterface.addIndex('demo_profiles', ['domain'], {
            name: 'idx_demo_profiles_domain'
        });
        await queryInterface.addIndex('demo_profiles', ['email'], {
            name: 'idx_demo_profiles_email'
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('demo_profiles');
    }
};
