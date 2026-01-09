'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('explorers', 'syncFailedAttempts', {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      }, { transaction });

      await queryInterface.addColumn('explorers', 'syncDisabledAt', {
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('explorers', 'syncDisabledReason', {
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('explorers', 'nextRecoveryCheckAt', {
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      }, { transaction });

      // Add index on nextRecoveryCheckAt for efficient recovery job queries
      await queryInterface.addIndex('explorers', ['nextRecoveryCheckAt'], {
        name: 'explorers_next_recovery_check_at_idx',
        where: { nextRecoveryCheckAt: { [Sequelize.Op.ne]: null } },
        transaction
      });

      await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeIndex('explorers', 'explorers_next_recovery_check_at_idx', { transaction });
      await queryInterface.removeColumn('explorers', 'syncFailedAttempts', { transaction });
      await queryInterface.removeColumn('explorers', 'syncDisabledAt', { transaction });
      await queryInterface.removeColumn('explorers', 'syncDisabledReason', { transaction });
      await queryInterface.removeColumn('explorers', 'nextRecoveryCheckAt', { transaction });

      await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
      throw error;
    }
  }
};
