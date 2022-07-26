'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('transactions', 'blockId', {
        type: Sequelize.INTEGER,
        allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('transactions', 'blockId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            key: 'id',
            model: {
              tableName: 'blocks'
            }
          },
        onDelete: 'CASCADE'
    });
  }
};
