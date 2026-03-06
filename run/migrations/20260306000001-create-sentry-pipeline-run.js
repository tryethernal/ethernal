'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sentry_pipeline_runs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      sentryIssueId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      sentryProject: {
        type: Sequelize.STRING,
        allowNull: true
      },
      sentryTitle: {
        type: Sequelize.STRING,
        allowNull: true
      },
      sentryLevel: {
        type: Sequelize.STRING,
        allowNull: true
      },
      sentryEventCount: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      sentryLink: {
        type: Sequelize.STRING,
        allowNull: true
      },
      githubIssueNumber: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      githubPrNumber: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      workflowRunId: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM(
          'discovered', 'triaging', 'fixing', 'reviewing',
          'merging', 'deploying', 'completed', 'closed',
          'escalated', 'failed'
        ),
        allowNull: false,
        defaultValue: 'discovered'
      },
      currentStep: {
        type: Sequelize.STRING,
        allowNull: true
      },
      triageDecision: {
        type: Sequelize.STRING,
        allowNull: true
      },
      triageReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      fixSummary: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      conversationLog: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('sentry_pipeline_runs', ['status']);
    await queryInterface.addIndex('sentry_pipeline_runs', ['workflowRunId'], { unique: true, where: { workflowRunId: { [Sequelize.Op.ne]: null } } });
    await queryInterface.addIndex('sentry_pipeline_runs', ['githubIssueNumber']);
    await queryInterface.addIndex('sentry_pipeline_runs', ['createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sentry_pipeline_runs');
  }
};
