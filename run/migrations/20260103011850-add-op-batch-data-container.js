'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create the enum type first
    await queryInterface.sequelize.query(
      "CREATE TYPE \"enum_op_batches_dataContainer\" AS ENUM ('in_blob4844', 'in_calldata')"
    );

    // Add the column
    await queryInterface.addColumn('op_batches', 'dataContainer', {
      type: Sequelize.ENUM('in_blob4844', 'in_calldata'),
      allowNull: true
    });

    // Update existing batches based on blobHash presence
    await queryInterface.sequelize.query(
      "UPDATE op_batches SET \"dataContainer\" = CASE WHEN \"blobHash\" IS NOT NULL THEN 'in_blob4844'::\"enum_op_batches_dataContainer\" ELSE 'in_calldata'::\"enum_op_batches_dataContainer\" END"
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('op_batches', 'dataContainer');
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS \"enum_op_batches_dataContainer\"");
  }
};
