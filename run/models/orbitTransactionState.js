'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrbitTransactionState extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
              OrbitTransactionState.belongsTo(models.Transaction, {
            foreignKey: 'transactionId',
            as: 'transaction'
        });
        
        // Associate with batch based on batch sequence number in state data
        OrbitTransactionState.belongsTo(models.OrbitBatch, {
            foreignKey: 'batchSequenceNumber',
            targetKey: 'batchSequenceNumber',
            as: 'batch',
            constraints: false // No foreign key constraint since it's stored in JSON
        });
      OrbitTransactionState.belongsTo(models.Workspace, { 
        foreignKey: 'workspaceId', 
        as: 'workspace' 
      });
    }

    /**
     * Update the transaction state and set appropriate timestamp
     */
    async updateState(newState, stateData = {}) {
      const updateData = {
        currentState: newState,
        stateData: { ...this.stateData, ...stateData }
      };

      // Set timestamp for the new state
      const timestampField = `${newState.toLowerCase()}At`;
      if (this[timestampField] === null || this[timestampField] === undefined) {
        updateData[timestampField] = new Date();
      }

      return this.update(updateData);
    }

    /**
     * Get the complete state timeline with status information
     */
    getStateTimeline() {
      const states = ['SUBMITTED', 'SEQUENCED', 'POSTED', 'CONFIRMED', 'FINALIZED'];
      return states.map(state => {
        const timestampField = `${state.toLowerCase()}At`;
        const blockNumberField = `${state.toLowerCase()}BlockNumber`;
        const txHashField = state === 'SUBMITTED' ? 'submittedTxHash' :
                          state === 'POSTED' ? 'postedTxHash' :
                          state === 'CONFIRMED' ? 'confirmationTxHash' : null;

        return {
          state,
          timestamp: this[timestampField],
          blockNumber: this[blockNumberField],
          txHash: txHashField ? this[txHashField] : null,
          isComplete: !!this[timestampField],
          isCurrent: this.currentState === state,
          data: this.stateData && this.stateData[state.toLowerCase()] ? this.stateData[state.toLowerCase()] : null
        };
      });
    }

    /**
     * Get the next possible states from current state
     */
    getNextStates() {
      const stateFlow = {
        'SUBMITTED': ['SEQUENCED', 'FAILED'],
        'SEQUENCED': ['POSTED', 'FAILED'],
        'POSTED': ['CONFIRMED', 'FAILED'],
        'CONFIRMED': ['FINALIZED'],
        'FINALIZED': [],
        'FAILED': []
      };
      return stateFlow[this.currentState] || [];
    }

    /**
     * Check if the transaction is in a final state
     */
    isFinalState() {
      return ['FINALIZED', 'FAILED'].includes(this.currentState);
    }

    /**
     * Check if the transaction has failed
     */
    hasFailed() {
      return this.currentState === 'FAILED';
    }

    /**
     * Get the progress percentage (0-100)
     */
    getProgressPercentage() {
      const stateValues = {
        'SUBMITTED': 20,
        'SEQUENCED': 40,
        'POSTED': 60,
        'CONFIRMED': 80,
        'FINALIZED': 100,
        'FAILED': 0
      };
      return stateValues[this.currentState] || 0;
    }

    /**
     * Mark transaction as failed with reason
     */
    async markAsFailed(reason) {
      return this.update({
        currentState: 'FAILED',
        failedAt: new Date(),
        failureReason: reason
      });
    }

    /**
     * Set block number and transaction hash for a specific state
     */
    async setStateDetails(state, blockNumber, txHash = null) {
      const updateData = {};
      const blockNumberField = `${state.toLowerCase()}BlockNumber`;
      const txHashField = state === 'SUBMITTED' ? 'submittedTxHash' :
                        state === 'POSTED' ? 'postedTxHash' :
                        state === 'CONFIRMED' ? 'confirmationTxHash' : null;

      if (blockNumber) {
        updateData[blockNumberField] = blockNumber;
      }

      if (txHash && txHashField) {
        updateData[txHashField] = txHash;
      }

      return this.update(updateData);
    }

    /**
     * Get estimated time to completion based on current state
     */
    getEstimatedTimeToCompletion() {
      // These are rough estimates and can be made more sophisticated
      const estimationMinutes = {
        'SUBMITTED': 5,    // 5 minutes to sequencing
        'SEQUENCED': 15,   // 15 minutes to posting
        'POSTED': 4320,    // 3 days (4320 minutes) to confirmation
        'CONFIRMED': 10080, // 7 days (10080 minutes) to finalization
        'FINALIZED': 0,
        'FAILED': 0
      };

      return estimationMinutes[this.currentState] || 0;
    }

    /**
     * Get a human-readable status description
     */
    getStatusDescription() {
      const descriptions = {
        'SUBMITTED': 'Transaction submitted to the Orbit chain and waiting to be sequenced',
        'SEQUENCED': 'Transaction included in a sequencer batch and waiting to be posted to parent chain',
        'POSTED': 'Batch containing transaction posted to parent chain, waiting for confirmation',
        'CONFIRMED': 'Assertion containing transaction confirmed on parent chain, waiting for finalization',
        'FINALIZED': 'Transaction is finalized and cannot be challenged',
        'FAILED': this.failureReason || 'Transaction processing failed'
      };
      return descriptions[this.currentState] || 'Unknown state';
    }
  }

  OrbitTransactionState.init({
    transactionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    workspaceId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    currentState: {
      type: DataTypes.ENUM('SUBMITTED', 'SEQUENCED', 'POSTED', 'CONFIRMED', 'FINALIZED', 'FAILED'),
      allowNull: false
    },
    stateData: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    submittedBlockNumber: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    submittedTxHash: {
      type: DataTypes.STRING(66),
      allowNull: true
    },
    sequencedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sequencedBlockNumber: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    sequencerBatchIndex: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    postedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    postedBlockNumber: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    postedTxHash: {
      type: DataTypes.STRING(66),
      allowNull: true
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    confirmedBlockNumber: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    confirmationTxHash: {
      type: DataTypes.STRING(66),
      allowNull: true
    },
    finalizedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    finalizedBlockNumber: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    failedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'OrbitTransactionState',
    tableName: 'orbit_transaction_states'
  });

  return OrbitTransactionState;
};