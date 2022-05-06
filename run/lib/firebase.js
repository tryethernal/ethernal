const models = require('../models');
const User = models.User;
const TokenTransfer = models.TokenTransfer;
const Transaction = models.Transaction;
const Workspace = models.Workspace;
const writeLog = require('./writeLog');

const getWorkspaceBlock = async (workspaceId, number, withTransactions) => {
    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const blocks = withTransactions ?
            await workspace.getBlocks({
                where: { number: number },
                include: {
                    model: Transaction,
                    as: 'transactions',
                    include: 'receipt'
                }
            }) :
            await workspace.getBlocks({ where: { number: number }});
        return blocks[0].toJSON();
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.getWorkspaceBlocks',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
        })
    }
}

const getWorkspaceBlocks = async (workspaceId, page, itemsPerPage = 10, order = 'DESC') => {
    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const blocks = await workspace.getFilteredBlocks(page, itemsPerPage, order);
        const totalBlockCount = await workspace.countBlocks();
        return {
            items: blocks.map(b => b.toJSON()),
            itemsPerPage: parseInt(itemsPerPage),
            total: totalBlockCount
        };
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.getWorkspaceBlocks',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
        })
    }
}

const getUser = async (id) => {
    try {
        const user = await User.findByAuthId(id);
        return user.toJSON();
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.getUser',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: id
        })
    }
};

const createUser = async (uid, data) => {
    try {
        await User.safeCreate(uid, data.email, data.apiKey, data.stripeCustomerId, data.plan);
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.createUser',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: uid
        })
    }
};

const getUserWorkspaces = async (userId) => {
    try {
        const user = await User.findByAuthId(userId);
        return user.workspaces.map(w => w.toJSON());
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.getUserWorkspaces',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        })
    }
};

const addIntegration = async (userId, workspace, integration) => {
    if (!userId || !workspace || !integration) throw '[addIntegration] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        await user.workspaces[0].addIntegration(integration);
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.addIntegration',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        })
    }
};

const removeIntegration = async (userId, workspace, integration) => {
    if (!userId || !workspace || !integration) throw '[removeIntegration] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        await user.workspaces[0].removeIntegration(integration);
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.removeIntegration',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        })
    }
};

const createWorkspace = async (userId, name, data) => {
    if (!userId || !name || !data) throw '[createWorkspace] Missing parameter';

    try {
        const user = await User.findByAuthId(userId);
        await user.safeCreateWorkspace({
            name: name,
            ...data
        });
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.createWorkspace',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        })
    }
};

const getWorkspaceByName = async (userId, workspaceName) => {
    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspaceName);
        if (user.workspaces && user.workspaces.length)
            return user.workspaces[0].toJSON();
        else
            throw new Error(`Couldn't find workspace ${workspaceName} for user ${userId}`);
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.getWorkspaceByName',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId,
        })
    }
};

const storeBlock = async (userId, workspace, block) => {
    if (!userId || !workspace || !block) throw '[storeBlock] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const existingBlock = await user.workspaces[0].findBlockByNumber(block.number);

        if (existingBlock)
            console.log(`Block ${existingBlock.number} has already been synced in workspace ${workspace}. Reset the workspace if you want to override it.`)
        else
            return await user.workspaces[0].safeCreateBlock(block);
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.storeBlock',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        })
    }
};

const storeTransaction = async (userId, workspace, transaction) => {
    if (!userId || !workspace || !transaction) throw '[storeTransaction] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const block = await user.workspaces[0].findBlockByNumber(transaction.blockNumber);
        if (!block)
            throw new Error(`Couldn't find block ${transaction.blockNumber}`);

        const existingTx = await user.workspaces[0].findTransaction(transaction.hash);
        if (existingTx)
            console.log(`Transaction ${existingTx.hash} already exists in workspace ${workspace}. Reset the workspace if you want to override it.`);
        else
            return await user.workspaces[0].safeCreateTransaction(transaction, block.id);
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.storeTransaction',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        })
    }
};

const storeTransactionMethodDetails = async (userId, workspace, transactionHash, methodDetails) => {
    if (!userId || !workspace || !transactionHash) throw '[storeTransactionMethodDetails] Missing parameter';
    
    if (methodDetails) {
        try {
            const user = await User.findByAuthIdWithWorkspace(userId, workspace);
            const transaction = await user.workspaces[0].findTransaction(transactionHash);
            await transaction.updateMethodDetails(methodDetails);
        } catch(error) {
            writeLog({
                log: 'postgresLogs',
                functionName: 'firebase.storeTransactionMethodDetails',
                message: (error.original && error.original.message) || error,
                detail: error.original && error.original.detail,
                transactionHash: transactionHash,
                uid: userId
            });
        }
    }
};

const storeTransactionTokenTransfers = async (userId, workspace, transactionHash, tokenTransfers) => {
    if (!userId || !workspace || !transactionHash || !tokenTransfers) throw '[storeTransactionTokenTransfers] Missing parameter';
    
    if (tokenTransfers.length) {
        try {
            const user = await User.findByAuthIdWithWorkspace(userId, workspace);
            const transaction = await user.workspaces[0].findTransaction(transactionHash);
            if (!transaction)
                throw new Error(`Couldn't find transaction ${transactionHash}`);

            for (let i = 0; i < tokenTransfers.length; i++)
                await transaction.safeCreateTokenTransfer(tokenTransfers[i]);
        } catch(error) {
            writeLog({
                log: 'postgresLogs',
                functionName: 'firebase.storeTransactionTokenTransfers',
                message: (error.original && error.original.message) || error,
                detail: error.original && error.original.detail,
                transactionHash: transactionHash,
                uid: userId
            });
        }
    }
};

const storeContractData = async (userId, workspace, address, data) => {
    if (!userId || !workspace || !address || !data) throw '[storeContractData] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        await user.workspaces[0].safeCreateOrUpdateContract({ address: address, ...data });
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.storeContractData',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        });
    }
};

const storeContractArtifact = (userId, workspace, address, artifact) => {
    if (!userId || !workspace || !address || !artifact) throw '[storeContractArtifact] Missing parameter';

    throw 'Not implemented';
};

const storeContractDependencies = (userId, workspace, address, dependencies) => {
    if (!userId || !workspace || !address || !dependencies) throw '[storeContractDependencies] Missing parameter';

    throw 'Not implemented';
};

const getContractArtifact = (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw '[getContractArtifact] Missing parameter';
    
    throw 'Not implemented';
};

const getContractArtifactDependencies = (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw '[getContractArtifactDependencies] Missing parameter';
    
    throw 'Not implemented';
};

const resetDatabaseWorkspace = (userId, workspace) => {
    if (!userId || !workspace) throw '[resetDatabaseWorkspace] Missing parameter';
    
    throw 'Not implemented';
};

const removeDatabaseContractArtifacts = (userId, workspace, address) => {
    if (!userId || !workspace) throw '[removeDatabaseContractArtifacts] Missing parameter';
    
    throw 'Not implemented';
};

const getContractData = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw '[getContractData] Missing parameter';
    
    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const contract = await user.workspaces[0].findContractByAddress(address);

        if (contract && contract.abi)
            return contract.toJSON();
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.getContractData',
            message: (error.original && error.original.message) || error.stack,
            detail: error.original && error.original.detail,
            address: address,
            uid: userId
        });
    }
};

const getContractByHashedBytecode = async (userId, workspace, hashedBytecode, exclude = []) => {
    if (!userId || !workspace || !hashedBytecode) {
        throw '[getContractByHashedBytecode] Missing parameter';
    }

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const contract = await user.workspaces[0].findContractByHashedBytecode(hashedBytecode);

        if (contract)
            return contract.toJSON();
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.getContractByHashedBytecode',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        });
    }
};

const storeAccountPrivateKey = (userId, workspace, address, privateKey) => {
    if (!userId || !workspace || !address || !privateKey) throw '[storeAccountPrivateKey] Missing parameter';

    throw 'Not implemented';
};

const getAccount = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw '[getAccount] Missing parameter';

    throw 'Not implemented';
};

const storeTrace = async (userId, workspace, txHash, trace) => {
    if (!userId || !workspace || !txHash || !trace) throw '[storeTrace] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const transaction = await user.workspaces[0].findTransaction(txHash);

        if (!transaction)
            throw new Error(`Couldn't find transaction ${txHash}`);

        for (let i = 0; i < trace.length; i++)
            await transaction.safeCreateTransactionTraceStep(trace[i]);
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.storeTrace',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            transactionHash: txHash,
            uid: userId
        });
    }
};

const storeTransactionData = async (userId, workspace, hash, data) => {
    if (!userId || !workspace || !hash || !data) throw '[storeTransactionData] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const transaction = await user.workspaces[0].findTransaction(hash);

        if (!transaction)
            throw new Error(`Couldn't find transaction ${txHash}`);

        await transaction.safeUpdateStorage(data);
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.storeTransactionData',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            transactionHash: hash,
            uid: userId
        });
    }
};

const storeTokenBalanceChanges = async (userId, workspace, transactionHash, tokenBalanceChanges) => {
    if (!userId || !workspace || !transactionHash || !tokenBalanceChanges) throw '[storeTokenBalanceChanges] Missing parameter';

    if (Object.keys(tokenBalanceChanges).length) {
        try {
            const user = await User.findByAuthIdWithWorkspace(userId, workspace);
            const transaction = await user.workspaces[0].findTransaction(transactionHash);

            if (!transaction)
                throw new Error(`Couldn't find transaction ${transactionHash}`);

            for (const [token, balanceChanges] of Object.entries(tokenBalanceChanges)) {
                for (let i = 0; i < balanceChanges.length; i++)
                    await transaction.safeCreateTokenBalanceChange({
                        token: token,
                        ...balanceChanges[i]
                    });
            }
        } catch(error) {
            writeLog({
                log: 'postgresLogs',
                functionName: 'firebase.storeTokenBalanceChanges',
                message: (error.original && error.original.message) || error,
                detail: error.original && error.original.detail,
                transactionHash: transactionHash,
                uid: userId
            });
        }
    }
};

const storeFailedTransactionError = async (userId, workspace, transactionHash, error) => {
    if (!userId || !workspace || !transactionHash || !error) throw '[storeFailedTransactionError] Missing parameter';

    if (error) {
        try {
            const user = await User.findByAuthIdWithWorkspace(userId, workspace);
            const transaction = await user.workspaces[0].findTransaction(transactionHash);

            if (!transaction)
                throw new Error(`Couldn't find transaction ${transactionHash}`);

            await transaction.updateFailedTransactionError({
                parsed: error.parsed,
                message: error.message
            });
        } catch(error) {
            writeLog({
                log: 'postgresLogs',
                functionName: 'firebase.storeFailedTransactionError',
                message: (error.original && error.original.message) || error,
                detail: error.original && error.original.detail,
                transactionHash: transactionHash,
                uid: userId
            });
        }
    }
};

const updateAccountBalance = (userId, workspace, account, balance) => {
    if (!userId || !workspace || !account || !balance) throw '[updateAccountBalance] Missing parameter';

    throw 'Not implemented';
};

const setCurrentWorkspace = async (userId, name) => {
    if (!userId || !name) throw '[setCurrentWorkspace] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, name);
        await user.update({ currentWorkspaceId: user.workspaces[0].id });
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.setCurrentWorkspace',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        });
    }
};

const updateWorkspaceSettings = async (userId, workspace, settings) => {
    if (!userId || !workspace || !settings) throw '[updateWorkspaceSettings] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        await user.workspaces[0].updateSettings(settings);
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.updateWorkspaceSettings',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        });
    }
};

const resetWorkspace = async (userId, workspace) => {
    if (!userId || !workspace) throw '[resetWorkspace] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        await user.workspaces[0].reset();
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.resetWorkspace',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        })
    }
};

const getUserbyStripeCustomerId = async (stripeCustomerId) => {
    if (!stripeCustomerId) throw '[getUserbyStripeCustomerId] Missing parameter';

    try {
        const user = await User.findByStripeCustomerId(stripeCustomerId);
        if (user)
            return user.toJSON();
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.getUserbyStripeCustomerId',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            stripeCustomerId: stripeCustomerId
        });
    }
};

const getUnprocessedContracts = async (userId, workspace) => {
    if (!userId || !workspace) throw '[getUnprocessedContracts] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const contracts = await user.workspaces[0].getUnprocessedContracts();
        if (contracts.length)
            return contracts.map(c => c.toJSON());
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.getUnprocessedContracts',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        });
    }
};

const isUserPremium = async (userId) => {
    if (!userId) throw '[isUserPremium] Missing parameter';

    const user = await getUser(userId);
    return user.plan == 'premium';
};

const canUserSyncContract = async (userId, workspace) => {
    if (!userId) throw '[canUserSyncContract] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        if (user.isPremium)
            return true;
        const contracts = await user.workspaces[0].getContracts();
        if (contracts.length >= 10)
            return false;
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.canUserSyncContract',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        });
    }
};

const getContractTransactions = async (userId, workspace, contractAddress) => {
    if (!userId || !workspace || !contractAddress) throw  '[getContractTransactions] Missing parameter';

    throw 'Not implemented';
};

const getTransaction = async (userId, workspace, transactionHash) => {
    if (!userId || !workspace || !transactionHash) throw '[getTransaction] Missing parameter';

    throw 'Not implemented';
};

const getPublicExplorerParamsBySlug = async (slug) => {
   if (!slug) throw '[getPublicExplorerParamsBySlug] Missing parameter';

   throw 'Not implemented';
};

const getContractDeploymentTxByAddress = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw '[getContractDeploymentTxByAddress] Missing parameter';

    throw 'Not implemented';
};

const updateContractVerificationStatus = async (userId, workspace, contractAddress, status) => {
    if (!userId || !workspace || !contractAddress || !status) throw '[updateContractVerificationStatus] Missing parameter';

    if (['success', 'pending', 'failed'].indexOf(status) === -1) return;

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const contracts = await user.workspaces[0].getContracts({ where: { address: contractAddress }});
        contracts[0].update({ verificationStatus: status });
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.updateContractVerificationStatus',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            address: contractAddress,
            uid: userId
        });
    }
};

const updateUserPlan = async (userId, plan) => {
    if (!userId || !plan) throw '[updateUserPlan] Missing parameter';

    if (['free', 'premium'].indexOf(plan) == -1)
        throw '[updateUserPlan] Invalid plan';

    try {
        const user = await User.findByAuthId(userId);
        await user.update({ plan: plan });
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.updateUserPlan',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            address: contractAddress,
            uid: userId
        });
    }
};

module.exports = {
    storeBlock: storeBlock,
    storeTransaction: storeTransaction,
    storeContractData: storeContractData,
    storeContractArtifact: storeContractArtifact,
    storeContractDependencies: storeContractDependencies,
    getContractData: getContractData,
    getWorkspaceByName: getWorkspaceByName,
    getUser: getUser,
    addIntegration: addIntegration,
    removeIntegration: removeIntegration,
    storeAccountPrivateKey: storeAccountPrivateKey,
    getAccount: getAccount,
    storeTrace: storeTrace,
    getContractByHashedBytecode: getContractByHashedBytecode,
    createWorkspace: createWorkspace,
    updateAccountBalance: updateAccountBalance,
    setCurrentWorkspace: setCurrentWorkspace,
    updateWorkspaceSettings: updateWorkspaceSettings,
    resetDatabaseWorkspace: resetDatabaseWorkspace,
    getContractArtifact: getContractArtifact,
    getContractArtifactDependencies: getContractArtifactDependencies,
    getUserbyStripeCustomerId: getUserbyStripeCustomerId,
    getUserWorkspaces: getUserWorkspaces,
    removeDatabaseContractArtifacts: removeDatabaseContractArtifacts,
    storeTransactionData: storeTransactionData,
    createUser: createUser,
    getUnprocessedContracts: getUnprocessedContracts,
    canUserSyncContract: canUserSyncContract,
    isUserPremium: isUserPremium,
    getContractTransactions: getContractTransactions,
    storeTransactionMethodDetails: storeTransactionMethodDetails,
    storeTokenBalanceChanges: storeTokenBalanceChanges,
    storeTransactionTokenTransfers: storeTransactionTokenTransfers,
    getTransaction: getTransaction,
    getPublicExplorerParamsBySlug: getPublicExplorerParamsBySlug,
    getContractDeploymentTxByAddress: getContractDeploymentTxByAddress,
    updateContractVerificationStatus: updateContractVerificationStatus,
    storeFailedTransactionError: storeFailedTransactionError,
    updateUserPlan: updateUserPlan,
    resetWorkspace: resetWorkspace,
    getWorkspaceBlocks: getWorkspaceBlocks,
    getWorkspaceBlock: getWorkspaceBlock
};
