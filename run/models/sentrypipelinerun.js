/**
 * @fileoverview SentryPipelineRun model - tracks the lifecycle of Sentry auto-fix pipeline runs.
 * Each run represents a Sentry issue being processed through triage, fix, review, and deploy stages.
 *
 * @module models/SentryPipelineRun
 *
 * @property {number} id - Primary key
 * @property {string} sentryIssueId - Sentry issue ID
 * @property {string} sentryProject - Project slug (ethernal-backend / ethernal-frontend)
 * @property {string} sentryTitle - Error title from Sentry
 * @property {string} sentryLevel - Severity (error/warning/info)
 * @property {number} sentryEventCount - Event count at discovery
 * @property {string} sentryLink - Full Sentry URL
 * @property {number} githubIssueNumber - Linked GitHub issue
 * @property {number} githubPrNumber - Linked pull request
 * @property {number} workflowRunId - GitHub Actions run ID
 * @property {string} status - Pipeline stage
 * @property {string} currentStep - Human-readable step description
 * @property {string} triageDecision - auto-fix / close / escalate
 * @property {string} triageReason - Explanation for triage decision
 * @property {string} fixSummary - Summary of the fix applied
 * @property {Object} conversationLog - Claude conversation turns (JSONB)
 * @property {number} duration - Total processing seconds
 * @property {Date} completedAt - When the run finished
 */

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SentryPipelineRun extends Model {
    static associate(models) {
      // No associations — standalone tracking table
    }
  }

  SentryPipelineRun.init({
    sentryIssueId: DataTypes.STRING,
    sentryProject: DataTypes.STRING,
    sentryTitle: DataTypes.STRING,
    sentryLevel: DataTypes.STRING,
    sentryEventCount: DataTypes.INTEGER,
    sentryLink: DataTypes.STRING,
    githubIssueNumber: DataTypes.INTEGER,
    githubPrNumber: DataTypes.INTEGER,
    workflowRunId: DataTypes.BIGINT,
    status: {
      type: DataTypes.ENUM(
        'discovered', 'triaging', 'fixing', 'reviewing',
        'merging', 'merged', 'deploying', 'completed', 'closed',
        'escalated', 'failed'
      ),
      allowNull: false,
      defaultValue: 'discovered'
    },
    currentStep: DataTypes.STRING,
    triageDecision: DataTypes.STRING,
    triageReason: DataTypes.TEXT,
    fixSummary: DataTypes.TEXT,
    conversationLog: DataTypes.JSONB,
    duration: DataTypes.INTEGER,
    completedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'SentryPipelineRun',
    tableName: 'sentry_pipeline_runs'
  });

  return SentryPipelineRun;
};
