'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('explorers', 'enrichment', {
            type: Sequelize.JSON,
            allowNull: true,
            defaultValue: null
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('explorers', 'enrichment');
    }
};
