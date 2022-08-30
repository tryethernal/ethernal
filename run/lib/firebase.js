const Sequelize = require('sequelize');
const writeLog = require('./writeLog');
const models = require('../models');

const Op = Sequelize.Op;
const User = models.User;
const TokenTransfer = models.TokenTransfer;
const Transaction = models.Transaction;
const Workspace = models.Workspace;
const TransactionReceipt = models.TransactionReceipt;
const Explorer = models.Explorer;
const TokenBalanceChange = models.TokenBalanceChange;

const getErc721TokenTransfers = async (workspaceId, contractAddress, index) => {
    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const contract = await workspace.findContractByAddress(contractAddress);

        const tokens = await contract.getErc721Tokens({ where: { index: index }});
        const transfers = tokens.length ? tokens[0].getTokenTransfers() : [];

        return transfers.map(t => t.toJSON());
    } catch(error) {
        writeLog({
            functionName: 'firebase.getErc721TokenTransfers',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                contractAddress: String(contractAddress),
                index: index
            }
        });
        throw error;
    }
};

const updateErc721Token = async (workspaceId, contractAddress, index, fields) => {
    if (!workspaceId || !contractAddress || !index || !fields) throw '[updateErc721TokenMetadata] Missing parameter';

    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const contract = await workspace.findContractByAddress(contractAddress);

        return contract.safeUpdateErc721Token(index, fields);
    } catch(error) {
        writeLog({
            functionName: 'firebase.updateErc721TokenMetadata',
            error: error,
            extra: {
                workspaceId: workspaceId,
                contractAddress: contractAddress,
                index: index,
                metadata: metadata
            }
        });
        throw error;
    }
};

const getContractErc721Token = async (workspaceId, contractAddress, index) => {
    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const contract = await workspace.findContractByAddress(contractAddress);

        const token = await contract.getErc721Token(index);

        return token ? token.toJSON() : null;
    } catch(error) {
        writeLog({
            functionName: 'firebase.getContractErc721Token',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                contractAddress: String(contractAddress),
                index: index
            }
        });
        throw error;
    }
};

const getContractErc721Tokens = async (workspaceId, contractAddress, page, itemsPerPage, orderBy, order) => {
    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const contract = await workspace.findContractByAddress(contractAddress);

        const tokens = await contract.getFilteredErc721Tokens(page, itemsPerPage, orderBy, order);
        const total = await contract.countErc721Tokens();

        return {
            items: tokens.map(t => t.toJSON()),
            total: total
        };
    } catch(error) {
        writeLog({
            functionName: 'firebase.getContractErc721Tokens',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                contractAddress: String(contractAddress)
            }
        });
        throw error;
    }
};

const storeErc721Token = async (workspaceId, contractAddress, token) => {
    if (!workspaceId || !contractAddress || !token) throw '[storeErc721Token] Missing parameter';

    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const contract = await workspace.findContractByAddress(contractAddress);

        return contract.safeCreateErc721Token(token);
    } catch(error) {
        writeLog({
            functionName: 'firebase.storeErc721Token',
            error: error,
            extra: {
                userId: String(userId),
                workspace: workspace,
                address: address,
                data: data
            }
        });
        throw error;
    }
};

const setWorkspaceRemoteFlag = async (userId, workspaceName, flag) => {
    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspaceName);
        const workspace = user.workspaces[0];

        return workspace.update({ isRemote: flag });
    } catch(error) {
        writeLog({
            functionName: 'firebase.setWorkspaceRemoteFlag',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                userId: String(userId),
                workspaceName: workspaceName
            }
        });
        throw error;
    }
};

const getWalletVolume = async (workspaceId, from, to) => {
    if (!workspaceId) throw '[getWalletVolume] Missing parameter';

    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const wallets = await workspace.getWalletVolume(from, to);
        return wallets;
    } catch(error) {
        writeLog({
            functionName: 'firebase.getWalletVolume',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                from: from,
                to: to
            }
        });
        throw error;
    }  
};

const getTransactionVolume = async (workspaceId, from, to) => {
    if (!workspaceId) throw '[getTransactionVolume] Missing parameter';

    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const transactions = await workspace.getTransactionVolume(from, to);
        return transactions;
    } catch(error) {
        writeLog({
            functionName: 'firebase.getTransactionVolume',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                from: from,
                to: to
            }
        });
        throw error;
    }  
};

const getActiveWalletCount = async (workspaceId) => {
    if (!workspaceId) throw '[getTotalTxCount] Missing parameter';

    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const wallets = await workspace.findActiveWallets();
        return wallets.length;
    } catch(error) {
        writeLog({
            functionName: 'firebase.getActiveWalletCount',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                since: since
            }
        });
        throw error;
    }  
};

const getTotalTxCount = async (workspaceId) => {
    if (!workspaceId) throw '[getTotalTxCount] Missing parameter';

    try {
        const workspace = await Workspace.findByPk(workspaceId);
        return await workspace.countTransactions();
    } catch(error) {
        writeLog({
            functionName: 'firebase.getTotalTxCount',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                since: since
            }
        });
        throw error;
    }
};

const getTxCount = async (workspaceId, since = 0) => {
    if (!workspaceId) throw '[getTxCount24h] Missing parameter';

    try {
        const workspace = await Workspace.findByPk(workspaceId);
        return await workspace.countTransactionsSince(since);
    } catch(error) {
        writeLog({
            functionName: 'firebase.getTxCount',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                since: since
            }
        });
        throw error;
    }
};

const getAddressLatestTokenBalances = async (workspaceId, address) => {
    if (!workspaceId|| !address) throw '[getAddressLatestTokenBalance] Missing parameter';

    try {
        const workspace = await Workspace.findByPk(workspaceId);
        return await workspace.safeFindLatestTokenBalances(address);
    } catch(error) {
        writeLog({
            functionName: 'firebase.getAddressLatestTokenBalances',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                address: address
            }
        });
        throw error;
    }
};

const searchForAddress = async (workspaceId, address) => {
    if (!workspaceId || !address) throw '[searchForAddress] Missing parameter';

    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const contract = await workspace.findContractByAddress(address);
        return contract ? [{
            type: 'contract',
            data: contract.toJSON()
        }] : [];
    } catch(error) {
        writeLog({
            functionName: 'firebase.searchForAddress',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                address: address
            }
        });
        throw error;
    }
};

const searchForHash = async (workspaceId, hash) => {
    if (!workspaceId || !hash) throw '[searchForHash] Missing parameter';

    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const transaction = await workspace.findTransaction(hash);
        if (transaction)
            return [{
                type: 'transaction',
                data: transaction.toJSON()
            }];
        else {
            const block = await workspace.findBlockByHash(hash);
            return block ? [{
                type: 'block',
                data: block.toJSON()
            }] : [];
        }
    } catch(error) {
        writeLog({
            functionName: 'firebase.searchForHash',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                hash: hash
            }
        });
        throw error;
    }
};

const searchForNumber = async (workspaceId, number) => {
    if (!workspaceId || !number) throw '[searchForNumber] Missing parameter';

    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const block = await workspace.findBlockByNumber(number, true);
        return block ? [{
            type: 'block',
            data: block.toJSON()
        }] : [];
    } catch(error) {
        writeLog({
            functionName: 'firebase.searchForNumber',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                block: number
            }
        });
        throw error;
    }
};

const searchForText = async (workspaceId, text) => {
    if (!workspaceId || !text) throw '[searchForText] Missing parameter';

    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const contracts = await workspace.findContractsByText(text);
        return contracts.map(c => ({
            type: 'contract',
            data: c.toJSON()
        }));
    } catch(error) {
        writeLog({
            functionName: 'firebase.searchForText',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                text: text
            }
        });
        throw error;
    }
};

const getWorkspaceById = async (workspaceId) => {
    try {
        const workspace = await Workspace.findByPk(workspaceId);
        return workspace.toJSON();
    } catch(error) {
        writeLog({
            functionName: 'firebase.getWorkspaceById',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId)
            }
        });
        throw error;
    }
};

const getWorkspaceContractById = async (workspaceId, contractId) => {
    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const contract = await workspace.findContractById(contractId);
        return contract ? contract.toJSON() : null;
    } catch(error) {
        writeLog({
            functionName: 'firebase.getWorkspaceContractById',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                contractId: String(contractId)
            }
        });
        throw error;
    }
};

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
            functionName: 'firebase.getWorkspaceBlock',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                number: String(number),
                withTransactions: String(withTransactions)
            }
        });
        throw error;
    }
}

const getWorkspaceBlocks = async (workspaceId, page = 1, itemsPerPage = 10, order = 'DESC') => {
    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const blocks = await workspace.getFilteredBlocks(page, itemsPerPage, order);
        const totalBlockCount = await workspace.countBlocks();

        return {
            items: blocks.map(b => b.toJSON()),
            total: totalBlockCount
        };
    } catch(error) {
        writeLog({
            functionName: 'firebase.getWorkspaceBlocks',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                page: String(page)
            }
        });
        throw error;
    }
};

const getWorkspaceTransaction = async (workspaceId, hash) => {
    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const transaction = await workspace.findTransaction(hash);

        return transaction.toJSON();
    } catch(error) {
        writeLog({
            functionName: 'firebase.getWorkspaceTransaction',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                hash: hash
            }
        });
        throw error;
    }
};

const getWorkspaceTransactions = async (workspaceId, page, itemsPerPage, order, orderBy) => {
    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const transactions = await workspace.getFilteredTransactions(page, itemsPerPage, order, orderBy);
        const totalTransactionCount = await workspace.countTransactions();
        return {
            items: transactions.map(t => t.toJSON()),
            total: totalTransactionCount
        };
    } catch(error) {
        writeLog({
            functionName: 'firebase.getWorkspaceTransactions',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
            }
        });
        throw error;
    }
};

const getAddressTransactions = async (workspaceId, address, page, itemsPerPage, order, orderBy) => {
    try {
        const workspace = await Workspace.findByPk(workspaceId);
        const transactions = await workspace.getFilteredTransactions(page, itemsPerPage, order, orderBy, address);
        const totalTransactionCount = await workspace.countTransactions({
            where: { [Op.or]: [{ to: address }, { from: address }] }
        });
        return {
            items: transactions.map(t => t.toJSON()),
            total: totalTransactionCount
        };
    } catch(error) {
        writeLog({
            functionName: 'firebase.getAddressTransactions',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                workspaceId: String(workspaceId),
                address: address
            }
        });
        throw error;
    }
};

const getWorkspaceContracts = async (userId, workspaceName, page, itemsPerPage, orderBy, order, onlyTokens) => {
    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspaceName);
        const workspace = user.workspaces[0];
        const contracts = await workspace.getFilteredContracts(page, itemsPerPage, orderBy, order, onlyTokens);
        const contractCount = await workspace.countContracts({
            where: onlyTokens ? { patterns: { [Op.contains]: ["erc20"] }} : {}
        });

        return {
            items: contracts.map(c => c.toJSON()),
            total: contractCount
        }
    } catch(error) {
        writeLog({
            functionName: 'firebase.getWorkspaceContracts',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                userId: String(userId),
                workspaceName: workspaceName
            }
        });
        throw error;
    }
};

const getWorkspaceContract = async (userId, workspaceName, address) => {
    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspaceName);
        const contract = await user.workspaces[0].findContractByAddress(address);

        return contract ? contract.toJSON() : null;
    } catch(error) {
        writeLog({
            functionName: 'firebase.getWorkspaceContract',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                userId: String(userId),
                workspaceName: workspaceName,
                address: address
            }
        });
        throw error;
    }
};

const getUserById = async (id) => {
    try {
        const user = await User.findByPk(id);
        return user ? user.toJSON() : null;
    } catch(error) {
        writeLog({
            functionName: 'firebase.getUserById',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                id: String(id)
            }
        });
        throw error;
    }
};

const getUser = async (id) => {
    try {
        const user = await User.findByAuthId(id);
        return user ? user.toJSON() : null;
    } catch(error) {
        writeLog({
            functionName: 'firebase.getUser',
            error: error,
            extra: {
                id: String(id)
            }
        });
        throw error;
    }
};

const createUser = async (uid, data) => {
    if (!uid || !data) throw '[createUser] Missing parameter';

    try {
        await User.safeCreate(uid, data.email, data.apiKey, data.stripeCustomerId, data.plan);
    } catch(error) {
        writeLog({
            functionName: 'firebase.createUser',
            error: error,
            extra: {
                parsedMessage: error.original && error.original.message,
                parsedDetail: error.original && error.original.detail,
                uid: String(uid),
                data: data
            }
        });
        throw error;
    }
};

const getUserWorkspaces = async (userId) => {
    try {
        const user = await User.findByAuthId(userId);
        return user.workspaces.map(w => w.toJSON());
    } catch(error) {
        writeLog({
            functionName: 'firebase.getUserWorkspaces',
            error: error,
            extra: {
                userId: String(userId)
            }
        });
        throw error;
    }
};

const addIntegration = async (userId, workspace, integration) => {
    if (!userId || !workspace || !integration) throw '[addIntegration] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        await user.workspaces[0].addIntegration(integration);
    } catch(error) {
        writeLog({
            functionName: 'firebase.addIntegration',
            error: error,
            extra: {
                userId: String(userId),
                workspace: workspace,
                integration: integration
            }
        });
        throw error;
    }
};

const removeIntegration = async (userId, workspace, integration) => {
    if (!userId || !workspace || !integration) throw '[removeIntegration] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        await user.workspaces[0].removeIntegration(integration);
    } catch(error) {
        writeLog({
            functionName: 'firebase.removeIntegration',
            error: error,
            extra: {
                userId: String(userId),
                workspace: workspace,
                integration: integration
            }
        });
        throw error;
    }
};

const createWorkspace = async (userId, data) => {
    if (!userId || !data) throw '[createWorkspace] Missing parameter';

    try {
        const user = await User.findByAuthId(userId);
        const workspace = await user.safeCreateWorkspace(data);
        return workspace ? workspace.toJSON() : null;
    } catch(error) {
        writeLog({
            functionName: 'firebase.createWorkspace',
            error: error,
            extra: {
                userId: String(userId),
                data: data
            }
        });
        throw error;
    }
};

const getWorkspaceByName = async (userId, workspaceName) => {
    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspaceName);
        return user.workspaces && user.workspaces.length ? user.workspaces[0].toJSON() : null;
    } catch(error) {
        writeLog({
            functionName: 'firebase.getWorkspaceByName',
            error: error,
            extra: {
                userId: String(userId),
                workspaceName: workspaceName
            }
        });
        throw error;
    }
};

const storeBlock = async (userId, workspace, block) => {
    if (!userId || !workspace || !block) throw '[storeBlock] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const existingBlock = await user.workspaces[0].findBlockByNumber(block.number);

        if (existingBlock) {
            console.log(`Block ${existingBlock.number} has already been synced in workspace ${workspace}. Reset the workspace if you want to override it.`)
            return null;
        }
        else {
            const newBlock = await user.workspaces[0].safeCreateBlock(block);
            return newBlock.toJSON();
        }
    } catch(error) {
        writeLog({
            functionName: 'firebase.storeBlock',
            error: error,
            extra: {
                userId: String(userId),
                workspace: workspace,
                block: block
            }
        });
        throw error;
    }
};

const storeTransaction = async (userId, workspace, transaction) => {
    if (!userId || !workspace || !transaction) throw '[storeTransaction] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const block = await user.workspaces[0].findBlockByNumber(transaction.blockNumber);

        if (!block)
            throw new Error(`Couldn't find block`);

        const existingTransaction = await user.workspaces[0].findTransaction(transaction.hash);

        if (existingTransaction)
            return null;

        const newTransaction = await user.workspaces[0].safeCreateTransaction(transaction, block.id);
        return newTransaction.toJSON();
    } catch(error) {
        writeLog({
            functionName: 'firebase.storeTransaction',
            error: error,
            extra: {
                userId: String(userId),
                workspace: workspace,
                transaction: transaction
            }
        });
        throw error;
    }
};

const storeTransactionTokenTransfers = async (userId, workspace, transactionHash, tokenTransfers) => {
    if (!userId || !workspace || !transactionHash || !tokenTransfers) throw '[storeTransactionTokenTransfers] Missing parameter';
    
    if (tokenTransfers.length) {
        try {
            const user = await User.findByAuthIdWithWorkspace(userId, workspace);
            const transaction = await user.workspaces[0].findTransaction(transactionHash);

            if (!transaction)
                throw new Error(`Couldn't find transaction`);

            for (let i = 0; i < tokenTransfers.length; i++)
                await transaction.safeCreateTokenTransfer(tokenTransfers[i]);
        } catch(error) {
            writeLog({
                functionName: 'firebase.storeTransactionTokenTransfers',
                error: error,
                extra: {
                    userId: String(userId),
                    workspace: workspace,
                    transactionHash: transactionHash,
                    tokenTransfers: tokenTransfers
                }
            });
            throw error;
        }
    }
};

const storeContractData = async (userId, workspace, address, data) => {
    if (!userId || !workspace || !address || !data) throw '[storeContractData] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        return user.workspaces[0].safeCreateOrUpdateContract({ address: address, ...data });
    } catch(error) {
        writeLog({
            functionName: 'firebase.storeContractData',
            error: error,
            extra: {
                userId: String(userId),
                workspace: workspace,
                address: address,
                data: data
            }
        });
        throw error;
    }
};

const getContract = async (userId, workspaceId, address) => {
    if (!userId || !workspaceId || !address) throw '[getContract] Missing parameter';

    try {
        const user = await User.findByPk(parseInt(userId));
        
        if (!user)
            return null;

        const workspaces = await user.getWorkspaces({ where: { id: workspaceId }});
        const contract = await workspaces[0].findContractByAddress(address);

        return contract ? contract.toJSON() : null;
    } catch(error) {
        writeLog({
            functionName: 'firebase.getContract',
            error: error,
            extra: {
                userId: String(userId),
                workspaceId: workspaceId,
                address: address
            }
        });
        throw error;
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

        return contract ? contract.toJSON() : null;
    } catch(error) {
        writeLog({
            functionName: 'firebase.getContractData',
            error: error,
            extra: {
                userId: String(userId),
                workspace: workspace,
                address: address,
            }
        });
        throw error;
    }
};

const getContractByHashedBytecode = async (userId, workspace, hashedBytecode) => {
    if (!userId || !workspace || !hashedBytecode) {
        throw '[getContractByHashedBytecode] Missing parameter';
    }

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const contract = await user.workspaces[0].findContractByHashedBytecode(hashedBytecode);

        return contract ? contract.toJSON() : null;
    } catch(error) {
        writeLog({
            functionName: 'firebase.getContractByHashedBytecode',
            error: error,
            extra: {
                userId: String(userId),
                workspace: workspace,
                hashedBytecode: hashedBytecode,
            }
        });
        throw error;
    }
};

const storeAccountPrivateKey = async (userId, workspace, address, privateKey) => {
    if (!userId || !workspace || !address || !privateKey) throw '[storeAccountPrivateKey] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const account = await user.workspaces[0].safeCreateOrUpdateAccount({ address: address, privateKey: privateKey });

        return account.toJSON();
    } catch(error) {
        writeLog({
            functionName: 'firebase.storeAccountPrivateKey',
            error: error,
            extra: {
                userId: String(userId),
                workspace: workspace,
                address: address,
                privateKey: privateKey
            }
        });
        throw error;
    }
};

const getAccount = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw '[getAccount] Missing parameter';

    throw 'Not implemented';
};

const getAccounts = async (userId, workspaceName, page, itemsPerPage, orderBy, order) => {
    if (!userId || !workspaceName) throw new Error('[getAccounts] Missing parameter');

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspaceName);
        const workspace = user.workspaces[0];

        const accounts = await workspace.getFilteredAccounts(page, itemsPerPage, orderBy, order);
        const count = await workspace.countAccounts();

        return {
            items: accounts.map(a => a.toJSON()),
            total: count
        }
    } catch(error) {
        writeLog({
            functionName: 'firebase.getAccounts',
            error: error,
            extra: {
                userId: String(userId),
                workspace: workspaceName
            }
        });
        throw error;
    }
}

const storeTrace = async (userId, workspace, txHash, trace) => {
    if (!userId || !workspace || !txHash || !trace) throw '[storeTrace] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const transaction = await user.workspaces[0].findTransaction(txHash);

        if (!transaction)
            throw new Error(`Couldn't find transaction`);

        for (let i = 0; i < trace.length; i++)
            await transaction.safeCreateTransactionTraceStep(trace[i]);
    } catch(error) {
        writeLog({
            functionName: 'firebase.storeTrace',
            error: error,
            extra: {
                userId: String(userId),
                workspace: workspace,
                txHash: txHash,
                trace: trace
            }
        });
        throw error;
    }
};

const storeTransactionData = async (userId, workspace, hash, data) => {
    if (!userId || !workspace || !hash || !data) throw '[storeTransactionData] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const transaction = await user.workspaces[0].findTransaction(hash);

        if (!transaction)
            throw new Error(`Couldn't find transaction`);

        await transaction.safeUpdateStorage(data);
        return transaction.toJSON();
    } catch(error) {
        writeLog({
            functionName: 'firebase.storeTransactionData',
            error: error,
            extra: {
                userId: String(userId),
                workspace: workspace,
                hash: hash,
                data: data
            }
        });
        throw error;
    }
};

const storeTokenBalanceChanges = async (userId, workspace, transactionHash, tokenBalanceChanges) => {
    if (!userId || !workspace || !transactionHash || !tokenBalanceChanges) throw '[storeTokenBalanceChanges] Missing parameter';

    if (Object.keys(tokenBalanceChanges).length) {
        try {
            const user = await User.findByAuthIdWithWorkspace(userId, workspace);
            const transaction = await user.workspaces[0].findTransaction(transactionHash);

            if (!transaction)
                throw new Error(`Couldn't find transaction`);

            for (const [token, balanceChanges] of Object.entries(tokenBalanceChanges)) {
                for (let i = 0; i < balanceChanges.length; i++)
                    await transaction.safeCreateTokenBalanceChange({
                        token: token,
                        ...balanceChanges[i]
                    });
            }
        } catch(error) {
            writeLog({
                functionName: 'firebase.storeTokenBalanceChanges',
                error: error,
                extra: {
                    userId: String(userId),
                    workspace: workspace,
                    transactionHash: transactionHash,
                    tokenBalanceChanges: tokenBalanceChanges
                }
            });
            throw error;
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

            return transaction.toJSON();
        } catch(error) {
            writeLog({
                functionName: 'firebase.storeFailedTransactionError',
                error: error,
                extra: {
                    userId: String(userId),
                    workspace: workspace,
                    transactionHash: transactionHash,
                    error: error
                }
            });
            throw error;
        }
    }
};

const updateAccountBalance = async (userId, workspace, address, balance) => {
    if (!userId || !workspace || !address || !balance) throw '[updateAccountBalance] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const account = await user.workspaces[0].safeCreateOrUpdateAccount({ address: address, balance: balance });

        return account.toJSON();
    } catch(error) {
        writeLog({
            functionName: 'firebase.updateAccountBalance',
            error: error,
            extra: {
                userId: String(userId),
                workspace: workspace,
                address: address,
                balance: balance
            }
        });
        throw error;
    }
};

const setCurrentWorkspace = async (userId, name) => {
    if (!userId || !name) throw '[setCurrentWorkspace] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, name);
        await user.update({ currentWorkspaceId: user.workspaces[0].id });

        return user.toJSON();
    } catch(error) {
        writeLog({
            functionName: 'firebase.setCurrentWorkspace',
            error: error,
            extra: {
                userId: String(userId),
                name: name
            }
        });
        throw error;
    }
};

const removeContract = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw '[removeContract] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        return user.workspaces[0].removeContractByAddress(address);
    } catch(error) {
        writeLog({
            functionName: 'firebase.removeContract',
            error: error,
            extra: {
                userId: String(userId),
                workspace: workspace,
                address: address
            }
        });
        throw error;
    }
};

const updateWorkspaceSettings = async (userId, workspace, settings) => {
    if (!userId || !workspace || !settings) throw '[updateWorkspaceSettings] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const newWorkspace = await user.workspaces[0].updateSettings(settings);
        return newWorkspace.toJSON();
    } catch(error) {
        writeLog({
            functionName: 'firebase.updateWorkspaceSettings',
            error: error,
            extra: {
                userId: String(userId),
                workspace: workspace,
                settings: settings
            }
        });
        throw error;
    }
};

const resetWorkspace = async (userId, workspace) => {
    if (!userId || !String(workspace)) throw '[resetWorkspace] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, String(workspace));
        if (user && user.workspaces.length)
            await user.workspaces[0].reset();
    } catch(error) {
        writeLog({
            functionName: 'firebase.resetWorkspace',
            error: error,
            extra: {
                userId: String(userId),
                workspace: workspace
            }
        });
        throw error;
    }
};

const getUserbyStripeCustomerId = async (stripeCustomerId) => {
    if (!stripeCustomerId) throw '[getUserbyStripeCustomerId] Missing parameter';

    try {
        const user = await User.findByStripeCustomerId(stripeCustomerId);
        return user ? user.toJSON() : null;
    } catch(error) {
        writeLog({
            functionName: 'firebase.getUserbyStripeCustomerId',
            error: error,
            extra: {
                stripeCustomerId: stripeCustomerId
            }
        });
        throw error;
    }
};

const getUnprocessedContracts = async (userId, workspace) => {
    if (!userId || !workspace) throw '[getUnprocessedContracts] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const contracts = await user.workspaces[0].getUnprocessedContracts();
        return contracts.map(c => c.toJSON());
    } catch(error) {
        writeLog({
            functionName: 'firebase.getUnprocessedContracts',
            error: error,
            extra: {
                userId: userId,
                workspace: workspace
            }
        });
        throw error;
    }
};

const isUserPremium = async (userId) => {
    if (!userId) throw '[isUserPremium] Missing parameter';

    const user = await User.findByAuthId(userId);;
    return user.isPremium;
};

const canUserSyncContract = async (userId, workspaceName, address) => {
    if (!userId) throw '[canUserSyncContract] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspaceName);
        if (user.isPremium)
            return true;

        const workspace = user.workspaces[0];

        // If the contract has already been synced we can update its data
        const existingContracts = await workspace.getContracts({ where: { address: address }});

        if (existingContracts.length > 0)
            return true;

        const contracts = await user.workspaces[0].getContracts();

        if (contracts.length >= 10)
            return false;
        else
            return true;
    } catch(error) {
        writeLog({
            functionName: 'firebase.canUserSyncContract',
            error: error,
            extra: {
                userId: userId,
                workspaceName: workspaceName,
                address: address
            }
        });
        throw error;
    }
};

const getTransaction = async (userId, workspace, transactionHash) => {
    if (!userId || !workspace || !transactionHash) throw '[getTransaction] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        return user.workspaces[0].findTransaction(transactionHash);
    } catch(error) {
        writeLog({
            functionName: 'firebase.getTransaction',
            error: error,
            extra: {
                userId: userId,
                workspace: workspace,
                transactionHash: transactionHash
            }
        });
        throw error;
    }
};

const getProcessableTransactions = async (uid, workspace) => {
    if (!uid || !workspace) throw '[getProcessableTransactions] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(uid, workspace);
        const transactions = await user.workspaces[0].getProcessableTransactions();
        return transactions.map(t => t.toJSON());
    } catch(error) {
        writeLog({
            functionName: 'firebase.getProcessableTransactions',
            error: error,
            extra: {
                uid: uid,
                workspace: workspace
            }
        });
        throw error;
    }
};

const getFailedProcessableTransactions = async (uid, workspace) => {
    if (!uid || !workspace) throw '[getFailedProcessableTransactions] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(uid, workspace);
        const transactions = await user.workspaces[0].getFailedProcessableTransactions();
        return transactions.map(t => t.toJSON());
    } catch(error) {
        writeLog({
            functionName: 'firebase.getFailedProcessableTransactions',
            error: error,
            extra: {
                uid: uid,
                workspace: workspace
            }
        });
        throw error;
    }
}

const getPublicExplorerParamsBySlug = async (slug) => {
   if (!slug) throw '[getPublicExplorerParamsBySlug] Missing parameter';

   try {
       const explorer = await Explorer.findBySlug(slug);
       return explorer ? explorer.toJSON() : null;
   } catch(error) {
        writeLog({
            functionName: 'firebase.getPublicExplorerParamsBySlug',
            error: error,
            extra: {
                slug: slug
            }
        });
        throw error;
    }
};

const getPublicExplorerParamsByDomain = async (domain) => {
   if (!domain) throw '[getPublicExplorerParamsByDomain] Missing parameter';

   try {
       const explorer = await Explorer.findByDomain(domain);
       return explorer ? explorer.toJSON() : null;
   } catch(error) {
        writeLog({
            functionName: 'firebase.getPublicExplorerParamsByDomain',
            error: error,
            extra: {
                domain: domain
            }
        });
        throw error;
    }
};

const getContractDeploymentTxByAddress = async (userId, workspaceId, address) => {
    if (!userId || !workspaceId || !address) throw '[getContractDeploymentTxByAddress] Missing parameter';

    try {
        const user = await User.findByPk(userId);
        const workspaces = await user.getWorkspaces({ where: { id: workspaceId }});
        const transactions = await workspaces[0].getTransactions({ where: { creates: address }});
        return transactions && transactions.length ? transactions[0].toJSON() : null;
    } catch(error) {
        writeLog({
            functionName: 'firebase.getContractDeploymentTxByAddress',
            error: error,
            extra: {
                userId: userId,
                workspaceId: workspaceId,
                address: address
            }
        });
        throw error;
    }
};

const updateContractVerificationStatus = async (userId, workspaceId, contractAddress, status) => {
    if (!userId || !workspaceId || !contractAddress || !status) throw '[updateContractVerificationStatus] Missing parameter';

    if (['success', 'pending', 'failed'].indexOf(status) === -1) return null;

    try {
        const user = await User.findByPk(userId);
        const workspaces = await user.getWorkspaces({ where: { id: workspaceId }});
        const contract = await workspaces[0].findContractByAddress(contractAddress);
        await contract.update({ verificationStatus: status });
        return contract.toJSON();
    } catch(error) {
        writeLog({
            functionName: 'firebase.updateContractVerificationStatus',
            error: error,
            extra: {
                userId: userId,
                workspaceId: workspaceId,
                contractAddress: contractAddress,
                status: status
            }
        });
        throw error;
    }
};

const updateUserPlan = async (userId, plan) => {
    if (!userId || !plan) throw '[updateUserPlan] Missing parameter';

    if (['free', 'premium'].indexOf(plan) === -1)
        throw new Error('[updateUserPlan] Invalid plan');

    try {
        const user = await User.findByAuthId(userId);
        await user.update({ plan: plan });
        return user.toJSON();
    } catch(error) {
        writeLog({
            functionName: 'firebase.updateUserPlan',
            error: error,
            extra: {
                userId: userId,
                plan: plan
            }
        });
        throw error;
    }
};

const getContractTransactions = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw '[getContractTransactions] Missing parameters';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const transactions = await user.workspaces[0].getTransactions({ where: { to: address }});
        return transactions.map(t => t.toJSON());
    } catch(error) {
        writeLog({
            functionName: 'firebase.getContractTransactions',
            error: error,
            extra: {
                userId: userId,
                workspace: workspace,
                address: address
            }
        });
        throw error;
    }
}

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
    getWorkspaceBlock: getWorkspaceBlock,
    getWorkspaceTransactions: getWorkspaceTransactions,
    getWorkspaceTransaction: getWorkspaceTransaction,
    getAddressTransactions: getAddressTransactions,
    removeContract: removeContract,
    getWorkspaceContracts: getWorkspaceContracts,
    getWorkspaceContract: getWorkspaceContract,
    getWorkspaceById: getWorkspaceById,
    getWorkspaceContractById: getWorkspaceContractById,
    getUserById: getUserById,
    getContract: getContract,
    getAccounts: getAccounts,
    getPublicExplorerParamsByDomain: getPublicExplorerParamsByDomain,
    getProcessableTransactions: getProcessableTransactions,
    getFailedProcessableTransactions: getFailedProcessableTransactions,
    searchForAddress: searchForAddress,
    searchForHash: searchForHash,
    searchForNumber: searchForNumber,
    searchForText: searchForText,
    getAddressLatestTokenBalances: getAddressLatestTokenBalances,
    getTxCount: getTxCount,
    getTotalTxCount: getTotalTxCount,
    getActiveWalletCount: getActiveWalletCount,
    getTransactionVolume: getTransactionVolume,
    getWalletVolume: getWalletVolume,
    setWorkspaceRemoteFlag: setWorkspaceRemoteFlag,
    storeErc721Token: storeErc721Token,
    getContractErc721Tokens: getContractErc721Tokens,
    getContractErc721Token: getContractErc721Token,
    getErc721TokenTransfers: getErc721TokenTransfers,
    updateErc721Token: updateErc721Token
};
