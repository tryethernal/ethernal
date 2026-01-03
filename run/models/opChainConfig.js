'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OpChainConfig extends Model {
    static associate(models) {
      OpChainConfig.belongsTo(models.Workspace, {
        foreignKey: 'workspaceId',
        as: 'workspace'
      });
      OpChainConfig.belongsTo(models.Workspace, {
        foreignKey: 'parentWorkspaceId',
        as: 'parentWorkspace'
      });
    }

    async safeUpdate(params) {
      const allowedParams = [
        'batchInboxAddress',
        'optimismPortalAddress',
        'l2OutputOracleAddress',
        'disputeGameFactoryAddress',
        'systemConfigAddress',
        'l2ToL1MessagePasserAddress',
        'outputVersion',
        'submissionInterval',
        'finalizationPeriodSeconds',
        'parentChainExplorer',
        'beaconUrl',
        'l2GenesisTimestamp'
      ];

      const filteredParams = {};
      for (const [key, value] of Object.entries(params)) {
        if (allowedParams.includes(key)) {
          filteredParams[key] = value;
        }
      }

      // Support both parentWorkspaceId (new) and parentChainId (legacy)
      if (params.parentWorkspaceId !== undefined) {
        const supportedParentChains = await sequelize.models.Workspace.getAvailableTopOpParent();
        const parentWorkspace = supportedParentChains.find(chain => chain.id === params.parentWorkspaceId);
        if (!parentWorkspace) {
          throw new Error(`Selected parent workspace is not a valid L1 parent.`);
        }
        filteredParams.parentWorkspaceId = parentWorkspace.id;
        filteredParams.parentChainId = parentWorkspace.networkId;
      } else if (params.parentChainId !== undefined) {
        const supportedParentChains = await sequelize.models.Workspace.getAvailableTopOpParent();
        const supportedParentChainIds = supportedParentChains.map(chain => chain.networkId);
        if (!supportedParentChainIds.includes(params.parentChainId)) {
          throw new Error(`Parent chain network is not supported yet. Available networks: ${supportedParentChainIds.join(', ')}`);
        }
        filteredParams.parentWorkspaceId = supportedParentChains.find(chain => chain.networkId === params.parentChainId).id;
      }

      return this.update(filteredParams);
    }
  }

  OpChainConfig.init({
    workspaceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    parentWorkspaceId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    parentChainId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    batchInboxAddress: {
      type: DataTypes.STRING(42),
      allowNull: false,
      set(value) {
        this.setDataValue('batchInboxAddress', value ? value.toLowerCase() : value);
      },
      validate: {
        isEthereumAddress(value) {
          if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
            throw new Error('Batch inbox address must be a valid Ethereum address');
          }
        }
      }
    },
    optimismPortalAddress: {
      type: DataTypes.STRING(42),
      allowNull: false,
      set(value) {
        this.setDataValue('optimismPortalAddress', value ? value.toLowerCase() : value);
      },
      validate: {
        isEthereumAddress(value) {
          if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
            throw new Error('Optimism portal address must be a valid Ethereum address');
          }
        }
      }
    },
    l2OutputOracleAddress: {
      type: DataTypes.STRING(42),
      allowNull: true,
      set(value) {
        this.setDataValue('l2OutputOracleAddress', value ? value.toLowerCase() : value);
      },
      validate: {
        isEthereumAddress(value) {
          if (value && !/^0x[a-fA-F0-9]{40}$/.test(value)) {
            throw new Error('L2 output oracle address must be a valid Ethereum address');
          }
        }
      }
    },
    disputeGameFactoryAddress: {
      type: DataTypes.STRING(42),
      allowNull: true,
      set(value) {
        this.setDataValue('disputeGameFactoryAddress', value ? value.toLowerCase() : value);
      },
      validate: {
        isEthereumAddress(value) {
          if (value && !/^0x[a-fA-F0-9]{40}$/.test(value)) {
            throw new Error('Dispute game factory address must be a valid Ethereum address');
          }
        }
      }
    },
    systemConfigAddress: {
      type: DataTypes.STRING(42),
      allowNull: true,
      set(value) {
        this.setDataValue('systemConfigAddress', value ? value.toLowerCase() : value);
      },
      validate: {
        isEthereumAddress(value) {
          if (value && !/^0x[a-fA-F0-9]{40}$/.test(value)) {
            throw new Error('System config address must be a valid Ethereum address');
          }
        }
      }
    },
    l2ToL1MessagePasserAddress: {
      type: DataTypes.STRING(42),
      allowNull: false,
      defaultValue: '0x4200000000000000000000000000000000000016',
      set(value) {
        this.setDataValue('l2ToL1MessagePasserAddress', value ? value.toLowerCase() : value);
      },
      validate: {
        isEthereumAddress(value) {
          if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
            throw new Error('L2ToL1MessagePasser address must be a valid Ethereum address');
          }
        }
      }
    },
    outputVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isIn: [[0, 1]]
      },
      comment: '0 = legacy (L2OutputOracle), 1 = fault proofs (DisputeGameFactory)'
    },
    submissionInterval: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Blocks between output submissions'
    },
    finalizationPeriodSeconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 604800,
      comment: 'Challenge period in seconds (default: 7 days)'
    },
    parentChainExplorer: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'https://etherscan.io'
    },
    l2BlockTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: 'L2 block time in seconds (default: 2 for OP Stack)'
    },
    beaconUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Beacon node URL for fetching blob data (e.g., https://beacon.example.com)'
    },
    l2GenesisTimestamp: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'L2 genesis block timestamp (Unix seconds) for block range calculation'
    }
  }, {
    sequelize,
    modelName: 'OpChainConfig',
    tableName: 'op_chain_configs'
  });

  return OpChainConfig;
};
