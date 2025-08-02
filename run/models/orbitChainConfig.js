'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrbitChainConfig extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      OrbitChainConfig.belongsTo(models.Workspace, { 
        foreignKey: 'workspaceId', 
        as: 'workspace' 
      });
    }

    /**
     * Validate that all required contract addresses are deployed contracts
     */
    async validateContracts() {
      const workspace = await this.getWorkspace();
      const provider = workspace.getProvider();
      
      const contracts = [
        { address: this.rollupContract, name: 'Rollup Contract' },
        { address: this.bridgeContract, name: 'Bridge Contract' },
        { address: this.inboxContract, name: 'Inbox Contract' },
        { address: this.sequencerInboxContract, name: 'Sequencer Inbox Contract' },
        { address: this.outboxContract, name: 'Outbox Contract' }
      ];

      for (const contract of contracts) {
        if (contract.address) {
          try {
            const code = await provider.getCode(contract.address);
            if (code === '0x') {
              throw new Error(`No contract found at ${contract.name} address: ${contract.address}`);
            }
          } catch (error) {
            throw new Error(`Failed to validate ${contract.name}: ${error.message}`);
          }
        }
      }

      // Validate optional contracts if provided
      const optionalContracts = [
        { address: this.challengeManagerContract, name: 'Challenge Manager Contract' },
        { address: this.validatorWalletCreatorContract, name: 'Validator Wallet Creator Contract' },
        { address: this.stakeToken, name: 'Stake Token Contract' }
      ];

      for (const contract of optionalContracts) {
        if (contract.address) {
          try {
            const code = await provider.getCode(contract.address);
            if (code === '0x') {
              throw new Error(`No contract found at ${contract.name} address: ${contract.address}`);
            }
          } catch (error) {
            throw new Error(`Failed to validate ${contract.name}: ${error.message}`);
          }
        }
      }
    }

    /**
     * Get contract configuration object
     */
    getContractConfig() {
      return {
        rollup: this.rollupContract,
        bridge: this.bridgeContract,
        inbox: this.inboxContract,
        sequencerInbox: this.sequencerInboxContract,
        outbox: this.outboxContract,
        challengeManager: this.challengeManagerContract,
        validatorWalletCreator: this.validatorWalletCreatorContract,
        stakeToken: this.stakeToken
      };
    }

    /**
     * Check if all required contracts are configured
     */
    isComplete() {
      return !!(
        this.rollupContract &&
        this.bridgeContract &&
        this.inboxContract &&
        this.sequencerInboxContract &&
        this.outboxContract &&
        this.parentChainId
      );
    }

    /**
     * Get a display-friendly summary of the configuration
     */
    getSummary() {
      return {
        chainType: this.chainType,
        parentChainId: this.parentChainId,
        confirmationPeriodBlocks: this.confirmationPeriodBlocks,
        contractsConfigured: this.isComplete(),
        hasOptionalContracts: !!(
          this.challengeManagerContract ||
          this.validatorWalletCreatorContract ||
          this.stakeToken
        )
      };
    }
  }

  OrbitChainConfig.init({
    workspaceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    rollupContract: {
      type: DataTypes.STRING(42),
      allowNull: false,
      validate: {
        isEthereumAddress(value) {
          if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
            throw new Error('Rollup contract must be a valid Ethereum address');
          }
        }
      }
    },
    bridgeContract: {
      type: DataTypes.STRING(42),
      allowNull: false,
      validate: {
        isEthereumAddress(value) {
          if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
            throw new Error('Bridge contract must be a valid Ethereum address');
          }
        }
      }
    },
    inboxContract: {
      type: DataTypes.STRING(42),
      allowNull: false,
      validate: {
        isEthereumAddress(value) {
          if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
            throw new Error('Inbox contract must be a valid Ethereum address');
          }
        }
      }
    },
    sequencerInboxContract: {
      type: DataTypes.STRING(42),
      allowNull: false,
      validate: {
        isEthereumAddress(value) {
          if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
            throw new Error('Sequencer inbox contract must be a valid Ethereum address');
          }
        }
      }
    },
    outboxContract: {
      type: DataTypes.STRING(42),
      allowNull: false,
      validate: {
        isEthereumAddress(value) {
          if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
            throw new Error('Outbox contract must be a valid Ethereum address');
          }
        }
      }
    },
    challengeManagerContract: {
      type: DataTypes.STRING(42),
      allowNull: true,
      validate: {
        isEthereumAddress(value) {
          if (value && !/^0x[a-fA-F0-9]{40}$/.test(value)) {
            throw new Error('Challenge manager contract must be a valid Ethereum address');
          }
        }
      }
    },
    validatorWalletCreatorContract: {
      type: DataTypes.STRING(42),
      allowNull: true,
      validate: {
        isEthereumAddress(value) {
          if (value && !/^0x[a-fA-F0-9]{40}$/.test(value)) {
            throw new Error('Validator wallet creator contract must be a valid Ethereum address');
          }
        }
      }
    },
    parentChainId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    confirmationPeriodBlocks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      validate: {
        min: 1
      }
    },
    stakeToken: {
      type: DataTypes.STRING(42),
      allowNull: true,
      validate: {
        isEthereumAddress(value) {
          if (value && !/^0x[a-fA-F0-9]{40}$/.test(value)) {
            throw new Error('Stake token must be a valid Ethereum address');
          }
        }
      }
    },
    baseStake: {
      type: DataTypes.STRING(78),
      allowNull: true,
      validate: {
        isNumeric: true
      }
    },
    chainType: {
      type: DataTypes.ENUM('ROLLUP', 'ANYTRUST'),
      allowNull: false,
      defaultValue: 'ROLLUP'
    }
  }, {
    sequelize,
    modelName: 'OrbitChainConfig',
    tableName: 'orbit_chain_configs'
  });

  return OrbitChainConfig;
};