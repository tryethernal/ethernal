'use strict';
const {
  Model
} = require('sequelize');
const { SUPPORTED_PARENT_CHAINS } = require('../constants/orbit');

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
      OrbitChainConfig.belongsTo(models.Workspace, {
        foreignKey: 'parentWorkspaceId',
        as: 'parentWorkspace'
      });
    }

    safeUpdate(params) {
      const allowedParams = [
        'parentChainRpcServer',
        'parentChainId',
        'parentChainExplorer',
        'rollupContract',
        'bridgeContract',
        'inboxContract',
        'sequencerInboxContract',
        'outboxContract',
        'l1GatewayRouter',
        'l1Erc20Gateway',
        'l1WethGateway',
        'l1CustomGateway',
        'l2GatewayRouter',
        'l2Erc20Gateway',
        'l2WethGateway',
        'l2CustomGateway',
        'challengeManagerContract',
        'validatorWalletCreatorContract',
        'stakeToken',
        'parentMessageCountShift'
      ];

      if (!SUPPORTED_PARENT_CHAINS.includes(params.parentChainId)) {
        throw new Error('Parent chain id must be 1 or 42161.');
      }

      const filteredParams = {};
      for (const [key, value] of Object.entries(params)) {
        if (allowedParams.includes(key)) {
          filteredParams[key] = value;
        }
      }

      return this.update(filteredParams);
    }

    async getTopParentWorkspace() {
      let parentWorkspaceId = this.parentWorkspaceId;
      let parentWorkspace = await sequelize.models.Workspace.findByPk(parentWorkspaceId, { include: 'orbitConfig' });
      while (parentWorkspaceId) {
        parentWorkspace = await sequelize.models.Workspace.findByPk(parentWorkspaceId, { include: 'orbitConfig' });
        if (!parentWorkspace.orbitConfig)
          parentWorkspaceId = null;
        else
          parentWorkspaceId = parentWorkspace.orbitConfig.parentWorkspaceId;
      }

      return parentWorkspace;
    }
  }

  OrbitChainConfig.init({
    workspaceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    parentWorkspaceId: {
      type: DataTypes.INTEGER,
      allowNull: true
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
    parentChainRpcServer: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        isUrl: {
          args: {
            protocols: ['http', 'https', 'ws', 'wss'],
            require_protocol: true
          },
          msg: 'Parent chain RPC server must be a valid URL'
        }
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
    },
    topParentChainBlockValidationType: {
      type: DataTypes.ENUM('LATEST', 'SAFE', 'FINALIZED'),
      allowNull: false,
      defaultValue: 'LATEST'
    },
    parentMessageCountShift: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    parentChainExplorer: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'https://etherscan.io'
    },
    l2GatewayRouter: DataTypes.STRING(42),
    l2Erc20Gateway: DataTypes.STRING(42),
    l2WethGateway: DataTypes.STRING(42),
    l2CustomGateway: DataTypes.STRING(42),
    l1GatewayRouter: DataTypes.STRING(42),
    l1Erc20Gateway: DataTypes.STRING(42),
    l1WethGateway: DataTypes.STRING(42),
    l1CustomGateway: DataTypes.STRING(42)
  }, {
    sequelize,
    modelName: 'OrbitChainConfig',
    tableName: 'orbit_chain_configs'
  });

  return OrbitChainConfig;
};