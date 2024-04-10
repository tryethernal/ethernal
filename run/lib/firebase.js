const Sequelize = require('sequelize');
const { getDemoUserId, getMaxBlockForSyncReset } = require('./env');
const models = require('../models');
const { firebaseHash }  = require('./crypto');

const Op = Sequelize.Op;
const User = models.User;
const TokenTransfer = models.TokenTransfer;
const Transaction = models.Transaction;
const Workspace = models.Workspace;
const TransactionReceipt = models.TransactionReceipt;
const Explorer = models.Explorer;
const Contract = models.Contract;
const Block = models.Block;
const StripeSubscription = models.StripeSubscription;
const StripePlan = models.StripePlan;
const ExplorerDomain = models.ExplorerDomain;
const RpcHealthCheck = models.RpcHealthCheck;

const getTransactionLogs = async (workspaceId, hash, page, itemsPerPage) => {
    if (!workspaceId || !hash)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const { count, rows: logs } = await workspace.getTransactionLogs(hash, page, itemsPerPage);

    return { count, logs };
};

const markWorkspaceForDeletion = async (workspaceId) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.update({ pendingDeletion: true });
};

const updateQuicknodeSubscription = async (qnId, qnEndpointId, stripePlanId) => {
    if (!qnId || !qnEndpointId || !stripePlanId)
        throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            '$admin.qnId$': qnId,
            '$workspace.qnEndpointId$': qnEndpointId
        },
        include: ['admin', 'workspace', 'stripeSubscription']
    });

    if (!explorer)
        throw new Error('Cannot find explorer');

    if (!explorer.stripeSubscription)
        throw new Error('Cannot find subscription');

    return explorer.stripeSubscription.update({ stripePlanId });
};

const findQuicknodeExplorer = async (qnId, qnEndpointId) => {
    if (!qnId || !qnEndpointId)
        throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            '$admin.qnId$': qnId,
            '$workspace.qnEndpointId$': qnEndpointId
        },
        include: [
            'admin', 'workspace',
            {
                model: StripeSubscription,
                as: 'stripeSubscription',
                include: 'stripePlan'
            }
        ]
    });

    return explorer ? explorer.toJSON() : null;
};

const findQuicknodeUser = async (qnId) => {
    if (!qnId)
        throw new Error('Missing parameter');

    const user = await User.findOne({
        where: { qnId },
        include: {
            model: Explorer,
            as: 'explorers',
            include: 'workspace'
        }
    });

    return user ? user.toJSON() : null;
};

const findQuicknodeWorkspace = (qnId, qnEndpointId) => {
    if (!qnId || !qnEndpointId)
        throw new Error('Missing parameter');

    return Workspace.findOne({
        where: {
            qnEndpointId,
            '$user.qnId$': qnId,
            pendingDeletion: false
        },
        include: ['explorer', 'user']
    });
};

const createQuicknodeWorkspace = async (qnId, qnEndpointId, name, rpcServer, networkId) => {
    if (!qnId || !qnEndpointId || !name || !rpcServer || !networkId)
        throw new Error('Missing parameter');

    const user = await User.findOne({ where: { qnId }});
    if (!user)
        throw new Error('Cannot find user');

    return user.safeCreateWorkspace({
        name, networkId, rpcServer, qnEndpointId,
        dataRetentionLimit: 0,
        public: true,
        chain: 'ethereum', 
        browserSyncEnabled: false,
        erc721LoadingEnabled: false
    });
};

const workspaceNeedsBatchReset = async (userId, workspaceId) => {
    if (!userId || !workspaceId)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findOne({
        where: {
            id: workspaceId,
            '$user.firebaseUserId$': userId
        },
        include: 'user'
    });

    if (!workspace)
        throw new Error('Cannot find workspace');

    const blocks = await workspace.getBlocks({ limit: getMaxBlockForSyncReset() });

    return blocks.length == getMaxBlockForSyncReset();
};

const resetExplorerTransactionQuota = async (userId, explorerId) => {
    if (!userId || !explorerId)
        throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            userId: userId
        }
    });

    if (!explorer)
        throw new Error(`Can't find explorer`);

    return explorer.resetTransactionQuota();
};

const makeExplorerDemo = async (explorerId) => {
    if (!explorerId) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.update({ isDemo: true });
};

const migrateDemoExplorer = async (explorerId, userId, stripeSubscription) => {
    if (!explorerId || !userId || !stripeSubscription) throw new Error('Missing parameter');

    const user = await User.findByPk(userId);
    if (!user)
        throw new Error('Cannot find user');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.migrateDemoTo(userId, stripeSubscription);
};

const createExplorerWithWorkspace = async (userId, workspaceData) => {
    if (!workspaceData) throw new Error('Missing parameter');

    const user = await User.findByPk(userId);
    if (!user)
        throw new Error('Cannot find user');

    return user.safeCreateWorkspaceWithExplorer(workspaceData);
};

const stopExplorerSync = async (explorerId) => {
    if (!explorerId) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.update({ shouldSync: false });
};

const startExplorerSync = async (explorerId) => {
    if (!explorerId) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.update({ shouldSync: true });
};

const resetFailedAttempts = async (workspaceId) => {
    if (!workspaceId) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId, {
        include: 'rpcHealthCheck'
    });

    if (!workspace || !workspace.rpcHealthCheck)
        return null;

    return workspace.rpcHealthCheck.resetFailedAttempts();
};

const incrementFailedAttempts = async (workspaceId) => {
    if (!workspaceId) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId, {
        include: 'rpcHealthCheck'
    });

    if (!workspace || !workspace.rpcHealthCheck)
        return null;

    return workspace.rpcHealthCheck.incrementFailedAttempts();
};

const canUserSyncBlock = async (userId) => {
    if (!userId) throw new Error('Missing parameter');

    const user = await User.findByPk(userId, {
        include: 'workspaces'
    });

    if (!user.isPremium && user.workspaces.length > 1)
        return false;

    return true;
};

const deleteWorkspace = async (userId, workspaceId) => {
    if (!userId || !workspaceId) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace || workspace.userId != userId)
        throw new Error('Cannot find workspace');

    return workspace.safeDelete();
};

const storeTransactionReceipt = async (transactionId, receipt) => {
    if (!transactionId || !receipt) throw new Error('Missing parameter');

    const transaction = await Transaction.findByPk(transactionId);
    if (!transaction)
        throw new Error('Cannot find transaction');

    return transaction.safeCreateReceipt(receipt);
};

const disableUserTrial = async (userId) => {
    if (!userId) throw new Error('Missing parameter');

    const user = await User.findByPk(userId);

    if (!user)
        throw new Error('Cannot find user');

    return user.disableTrialMode();
};

const getExplorerDomainById = async (userId, explorerDomainId) => {
    if (!userId || !explorerDomainId) throw new Error('Missing parameter');

    const domain = await ExplorerDomain.findOne({
        where: {
            id: explorerDomainId,
            '$explorer.userId$': userId
        },
        include: [
            {
                model: Explorer,
                as: 'explorer',
                attributes: ['userId']
            }
        ]
    });

    return domain ? domain.toJSON() : null;
};

const deleteExplorerDomain = async (userId, explorerDomainId) => {
    if (!userId || !explorerDomainId) throw new Error('Missing parameter');

    const domain = await ExplorerDomain.findOne({
        where: {
            id: explorerDomainId,
            '$explorer.userId$': userId
        },
        include: [
            {
                model: Explorer,
                as: 'explorer'
            }
        ]
    });

    if (!domain)
        throw new Error('Could not find domain');
    
    return domain.destroy();
};

const createExplorerDomain = async (explorerId, domain) => {
    if (!explorerId || !domain) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);

    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.safeCreateDomain(domain);
};

const deleteExplorer = async (userId, explorerId) => {
    if (!userId || !explorerId) throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            '$admin.id$': userId
        },
        include: ['admin']
    });

    if (!explorer)
        throw new Error(`Can't find explorer`);
    
    return explorer.safeDelete();
};

const createExplorerFromWorkspace = async (userId, workspaceId) => {
    if (!userId || !workspaceId) throw new Error('Missing parameter');

    const workspace = await Workspace.findOne({
        where: {
            userId: userId,
            id: workspaceId,
        }
    });

    if (!workspace)
        throw new Error('Could not find workspace');

    const explorer = await workspace.safeCreateExplorer();

    return explorer ? explorer.toJSON() : null;
};

const getContractById = async (contractId) => {
    if (!contractId) throw new Error('Missing parameter');

    const contract = await Contract.findByPk(contractId);

    return contract ? contract.toJSON() : null;
};

const deleteExplorerSubscription = async (userId, explorerId) => {
    if (!userId || !explorerId) throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            userId: userId
        }
    });

    if (!explorer)
        throw new Error(`Can't find explorer`);

    return explorer.safeDeleteSubscription();
};

const cancelExplorerSubscription = async (userId, explorerId) => {
    if (!userId || !explorerId) throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            userId: userId
        }
    });

    if (!explorer)
        throw new Error(`Can't find explorer`);

    return explorer.safeCancelSubscription();
};

const revertExplorerSubscriptionCancelation = async (userId, explorerId) => {
    if (!userId || !explorerId) throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            userId: userId
        }
    });

    if (!explorer)
        throw new Error(`Can't find explorer`);

    return explorer.safeRevertSubscriptionCancelation();
};

const updateExplorerSubscription = async (userId, explorerId, stripePlanId, stripeSubscription) => {
    if (!userId || !explorerId || !stripePlanId) throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            userId: userId
        }
    });

    if (!explorer)
        throw new Error(`Can't find explorer`);

    let cycleEndsAt = new Date(0);
    let status = 'active';
    let stripeId;

    if (stripeSubscription) {
        const customer = stripeSubscription.customer;
        cycleEndsAt = new Date(stripeSubscription.current_period_end * 1000);
        stripeId = stripeSubscription.id;

        if (stripeSubscription.status == 'trialing' && !customer.default_source && !customer.invoice_settings.default_payment_method)
            status = stripeSubscription.default_payment_method ? 'trial_with_card' : 'trial';
        else if (stripeSubscription.status == 'trialing' && (customer.default_source || customer.invoice_settings.default_payment_method))
            status = 'trial_with_card';
        else
            status = stripeSubscription.status;
    }

    return explorer.safeUpdateSubscription(stripePlanId, stripeId, cycleEndsAt, status);
};

const createExplorerSubscription = async (userId, explorerId, stripePlanId, stripeSubscription) => {
    if (!userId || !explorerId || !stripePlanId) throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            userId: userId
        }
    });

    if (!explorer)
        throw new Error(`Can't find explorer`);

    let cycleEndsAt = new Date(0);
    let status = 'active';
    let stripeId;

    if (stripeSubscription) {
        const customer = stripeSubscription.customer;
        cycleEndsAt = new Date(stripeSubscription.current_period_end * 1000);
        stripeId = stripeSubscription.id;

        if (stripeSubscription.status == 'trialing' && !customer.default_source && !customer.invoice_settings.default_payment_method)
            status = stripeSubscription.default_payment_method ? 'trial_with_card' : 'trial';
        else if (stripeSubscription.status == 'trialing' && (customer.default_source || customer.invoice_settings.default_payment_method))
            status = 'trial_with_card';
        else
            status = stripeSubscription.status;
    }

    return explorer.safeCreateSubscription(stripePlanId, stripeId, cycleEndsAt, status);
};

const getExplorerPlans = () => {
    return StripePlan.findAll({
        where: { public: true },
        attributes: ['capabilities', 'id', 'name', 'slug', 'stripePriceId', 'price'],
        order: [['id']]
    });
};

const storeContractVerificationData = async (workspaceId, address, verificationData) => {
    if (!workspaceId || !address || !verificationData) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);

    if (!workspace.public)
        throw new Error('This is a private workspace');

    const contract = await workspace.getContractByAddress(address);

    if (!contract)
        throw new Error('Cannot find contract');

    return contract.safeCreateVerification(verificationData);
};

const getStripePlan = async (slug) => {
    const plan = await StripePlan.findOne({
        where: { slug }
    });
    return plan ? plan.toJSON() : null;
}

const updateExplorerBranding = async (explorerId, branding) => {
    if (!explorerId || !branding) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);

    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.safeUpdateBranding(branding);
};

const updateExplorerSettings = async (explorerId, settings) => {
    if (!explorerId || !settings) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.safeUpdateSettings(settings);
};

const updateExplorerWorkspace = async (explorerId, workspaceId) => {
    if (!explorerId || !workspaceId) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Cannot find explorer');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Cannot find workspace')

    if (explorer.userId != workspace.userId)
        throw new Error('Invalid workspace');

    return explorer.update({ workspaceId: workspace.id, rpcServer: workspace.rpcServer, chainId: workspace.networkId });
};

const getExplorerById = (userId, id, withDemo = false) => {
    if (!userId || !id) throw new Error('Missing parameter');

    const where = withDemo ?
        {[Op.or]: [{ id, userId, isDemo: false }, { id, userId: getDemoUserId(), isDemo: true }]} :
        { id, userId };

    return Explorer.findOne({
        where,
        include: [
            {
                model: ExplorerDomain,
                as: 'domains'
            },
            {
                model: StripeSubscription,
                as: 'stripeSubscription',
                include: { model: StripePlan, as: 'stripePlan' }
            },
            {
                model: User,
                as: 'admin'
            },
            {
                model: Workspace,
                as: 'workspace',
                include: [
                    {
                        model: RpcHealthCheck,
                        as: 'rpcHealthCheck',
                        attributes: ['failedAttempts', 'isReachable']
                    }
                ]
            }
        ]
    });
}

const getUserExplorers = async (userId, page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'id') => {
    if (!userId) throw new Error('Missing parameter');

    let sanitizedOrderBy = ['id', 'name'].indexOf(orderBy) > -1 ? orderBy : 'id';
    if (sanitizedOrderBy == 'name')
        sanitizedOrderBy = Sequelize.fn('lower', Sequelize.col('"Explorer".name'));
    
    const { count, rows: explorers } = await Explorer.findAndCountAll({
        subQuery: false,
        where: { userId },
        attributes: ['id', 'name', 'domain', 'rpcServer', 'slug'],
        offset: (page - 1) * itemsPerPage,
        limit: itemsPerPage,
        order: [[sanitizedOrderBy, order]],
        include: [
            {
                model: ExplorerDomain,
                as: 'domains',
                attributes: ['domain'],
            },
            {
                model: Workspace,
                as: 'workspace',
                attributes: ['name'],
            },
            {
                model: StripeSubscription,
                as: 'stripeSubscription',
                attributes: ['status', 'isActive', 'isPendingCancelation', 'isTrialing', 'isTrialingWithCard']
            }
        ]
    });

    return {
        items: explorers.map(e => e.toJSON()),
        total: count
    };
}

const updateWorkspaceRpcHealthCheck = async (workspaceId, isReachable) => {
    if (!workspaceId || isReachable === null || isReachable === undefined) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);

    if (!workspace)
        throw new Error('Cannot find workspace');

    return workspace.safeCreateOrUpdateRpcHealthCheck(isReachable);
};

const updateWorkspaceIntegrityCheck = async (workspaceId, { blockId, status }) => {
    if (!workspaceId || (!blockId && !status)) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);

    if (!workspace)
        throw new Error('Cannot find workspace');

    return workspace.safeCreateOrUpdateIntegrityCheck({ blockId, status });
};

const getTransactionForProcessing = transactionId => {
    if (!transactionId) throw new Error('Missing parameter.');

    return Transaction.findOne({
        where: { id: transactionId },
        include: [
            {
                model: Contract,
                as: 'contract',
                attributes: ['abi']
            },
            {
                model: TransactionReceipt,
                as: 'receipt',
            },
            {
                model: TokenTransfer,
                as: 'tokenTransfers'
            },
            {
                model: Workspace,
                as: 'workspace',
                attributes: ['id', 'name', 'public', 'rpcServer'],
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'firebaseUserId']
                    },
                    {
                        model: RpcHealthCheck,
                        as: 'rpcHealthCheck'
                    },
                    {
                        model: Explorer,
                        as: 'explorer',
                        include: 'stripeSubscription'
                    }
                ]
            }
        ]
    });
};

const revertPartialBlock = async (blockId) => {
    if (!blockId) throw new Error('Missing parameter.');

    const block = await Block.findByPk(blockId);

    return block ? block.revertIfPartial() : null;
};

const syncPartialBlock = async (workspaceId, block) => {
    if (!workspaceId || !block) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);

    if (!workspace)
        throw new Error('Could not find workspace');

    const existingBlock = await workspace.findBlockByNumber(block.number);

    if (existingBlock)
        return null;

    const newBlock = await workspace.safeCreatePartialBlock(block);

    return newBlock.toJSON();
};

const syncFullBlock = async (workspaceId, data) => {
    if (!workspaceId || !data) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);

    if (!workspace)
        throw new Error('Could not find workspace');

    const existingBlock = await workspace.findBlockByNumber(data.block.number);

    if (existingBlock) {
        const newBlock = await workspace.safeCreateFullBlock(data);

        return newBlock ? newBlock.toJSON() : null;
    }
    else
        return null;
};

const createExplorer = async (userId, workspaceId, chainId, name, rpcServer, slug, themes, totalSupply, domain, token) => {
    if (!userId || !workspaceId || !chainId || !name || !rpcServer || !slug)
        throw new Error('Missing parameter');

    const explorer = await Explorer.safeCreateExplorer({
        userId: userId,
        workspaceId: workspaceId,
        chainId: chainId,
        name: name,
        rpcServer: rpcServer,
        slug: slug,
        themes: themes,
        totalSupply: totalSupply,
        domain: domain,
        token: token
    });
    return explorer ? explorer.toJSON() : null;
};

const updateBrowserSync = async (workspaceId, newValue) => {
    if (!workspaceId || newValue === undefined || newValue === null)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Cannot find workspace');

    return workspace.update({ browserSyncEnabled: newValue });
};

const updateUserFirebaseHash = async (email, passwordSalt, passwordHash) => {
    if (!email || !passwordSalt || !passwordHash)
        throw new Error('Missing parameter');

    const user = await User.findOne({ where: { email: email }});

    return user.update({ passwordSalt, passwordHash });
};

const setUserPassword = async (email, password) => {
    if (!email || !password)
        throw new Error('Missig parameter');

    const user = await User.findOne({ where: { email: email }});

    if (!user)
        throw new Error(`Can't find user with this email address.`);

    const { passwordHash, passwordSalt } = await firebaseHash(password);

    return user.update({ passwordHash, passwordSalt });
};

const getUserByEmail = async (email) => {
    const user = await User.findOne({ where: { email: email }, include: 'currentWorkspace' });
    return user ? user.toJSON() : null;
};

const getCustomTransactionFunction = async (workspaceId) => {
    if (!workspaceId) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);

    return await workspace.getCustomTransactionFunction();
};

const getAddressTokenTransfers = async (workspaceId, address, page, itemsPerPage, order, orderBy) => {
    if (!workspaceId || !address) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);

    const transfers = await workspace.getFilteredAddressTokenTransfers(address, page, itemsPerPage, order, orderBy);
    const transferCount = await workspace.countAddressTokenTransfers(address);

    return {
        items: transfers.map(t => t.toJSON()),
        total: transferCount
    };
};

const getAddressStats = async (workspaceId, address) => {
    if (!workspaceId || !address) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);

    const sentTransactionCount = await workspace.countAddressSentTransactions(address);
    const receivedTransactionCount = await workspace.countAddressReceivedTransactions(address);
    const sentErc20TokenTransferCount = await workspace.countAddressSentErc20TokenTransfers(address);
    const receivedErc20TokenTransferCount = await workspace.countAddressReceivedErc20TokenTransfers(address);

    return {
        sentTransactionCount: sentTransactionCount,
        receivedTransactionCount: receivedTransactionCount,
        sentErc20TokenTransferCount: sentErc20TokenTransferCount,
        receivedErc20TokenTransferCount: receivedErc20TokenTransferCount
    };
};

const getTransactionTokenTransfers = async (workspaceId, transactionHash, page, itemsPerPage, order, orderBy) => {
    if (!workspaceId || !transactionHash) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    const transaction = await workspace.findTransaction(transactionHash);

    if (!transaction)
        throw new Error('Cannot find transaction');

    const transfers = await transaction.getFilteredTokenTransfers(page, itemsPerPage, order, orderBy);
    const transferCount = await transaction.countTokenTransfers();

    return {
        items: transfers.map(t => t.toJSON()),
        total: transferCount
    };
};

const getTokenHolderHistory = async (workspaceId, address, from, to) => {
    if (!workspaceId || !address || !from || !to) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    if (!contract)
        throw new Error(`Can't find contract at this address`);

    return contract.getTokenHolderHistory(from, to);
};

const getTokenCirculatingSupply = async (workspaceId, address, from, to) => {
    if (!workspaceId || !address || !from || !to) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    if (!contract)
        throw new Error(`Can't find contract at this address`);

    return contract.getTokenCirculatingSupply(from, to);
};

const getTokenTransferVolume = async (workspaceId, from, to, address, type) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);

    if (address) {
        const contract = await workspace.findContractByAddress(address);
        if (!contract)
            throw new Error(`Can't find contract at this address`);
    }

    return workspace.getTokenTransferVolume(from, to, address, type);
};

const getTokenHolders = async (workspaceId, address, page, itemsPerPage, orderBy, order) => {
    if (!workspaceId || !address) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    if (!contract)
        throw new Error(`Can't find contract at this address`);

    const holders = await contract.getTokenHolders(page, itemsPerPage, orderBy, order);
    const holderCount = await contract.countTokenHolders();

    return {
        items: holders,
        total: holderCount
    };
};

const getTokenStats = async (workspaceId, address) => {
    if (!workspaceId || !address) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    if (!contract)
        throw new Error(`Can't find contract at this address`);

    const tokenHolderCount = await contract.countTokenHolders();
    const transactionCount = await contract.countTransactions();
    const tokenTransferCount = await contract.countTokenTransfers();
    const tokenCirculatingSupply = await contract.getCurrentTokenCirculatingSupply();

    return {
        tokenHolderCount: tokenHolderCount,
        transactionCount: transactionCount,
        tokenTransferCount: tokenTransferCount,
        tokenCirculatingSupply: tokenCirculatingSupply
    };
};

const getTokenTransfers = async (workspaceId, address, page, itemsPerPage, orderBy, order, fromBlock) => {
    if (!workspaceId || !address) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    if (!contract)
        throw new Error(`Can't find contract at this address.`);

    const { count, rows } = await contract.getTokenTransfers(page, itemsPerPage, orderBy, order, fromBlock);

    return {
        items: rows.map(t => t.toJSON()),
        total: count,
    };
};

const getTokenTransferForProcessing = async (tokenTransferId) => {
    if (!tokenTransferId) throw new Error('Missing parameter');

    const tokenTransfer = await TokenTransfer.findOne({
        where: { id: tokenTransferId },
        include: [
            {
                model: Workspace,
                as: 'workspace',
                attributes: ['name', 'rpcServer', 'public'],
                include: {
                    model: User,
                    as: 'user',
                    attributes: ['firebaseUserId']
                }
            },
            {
                model: Transaction,
                as: 'transaction',
                attributes: ['blockNumber']
            }
        ]
    });

    return tokenTransfer ? tokenTransfer.toJSON() : null;
}

const getContractLogs = async (workspaceId, address, signature, page, itemsPerPage, orderBy, order) => {
    if (!workspaceId || !address) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    if (!contract)
        throw new Error(`Can't find a contract at this address.`);

    const filteredLogs = await contract.getFilteredLogs(signature, page, itemsPerPage, orderBy, order);
    const logCount = await contract.countFilteredLogs(signature)

    return {
        items: filteredLogs,
        total: logCount
    };
};

const storeContractDataWithWorkspaceId = async (workspaceId, address, data = {}) => {
    if (!workspaceId || !address) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);

    if (!workspace)
        throw new Error('Cannot find workspace');

    const contract = await workspace.safeCreateOrUpdateContract({
        address: address,
        ...data
    });

    return contract ? contract.toJSON() : null;
};

const getContractByWorkspaceId = async (workspaceId, address) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    return contract ? contract.toJSON() : null;
};

const getErc721TokenTransfers = async (workspaceId, contractAddress, tokenId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(contractAddress);

    const transfers = await contract.getErc721TokenTransfersByTokenId(tokenId);

    return transfers.map(t => t.toJSON());
};

const updateErc721Token = async (workspaceId, contractAddress, index, fields) => {
    if (!workspaceId || !contractAddress || !index || !fields) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(contractAddress);

    return contract.safeUpdateErc721Token(index, fields);
};

const getContractErc721Token = async (workspaceId, contractAddress, tokenId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(contractAddress);

    const token = await contract.getErc721Token(tokenId);

    return token ? token.toJSON() : null;
};

const getContractErc721Tokens = async (workspaceId, contractAddress, page, itemsPerPage, orderBy, order) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(contractAddress);

    const tokens = await contract.getFilteredErc721Tokens(page, itemsPerPage, orderBy, order);
    const total = await contract.countErc721Tokens();

    return {
        items: tokens.map(t => t.toJSON()),
        total: total
    };
};

const storeErc721Token = async (workspaceId, contractAddress, token) => {
    if (!workspaceId || !contractAddress || !token) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(contractAddress);

    return contract.safeCreateOrUpdateErc721Token(token);
};

const setWorkspaceRemoteFlag = async (workspaceId, flag) => {
    const workspace = await Workspace.findByPk(workspaceId);

    return workspace.update({ isRemote: flag });
};

const getCumulativeDeployedContractCount = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const cumulativeDeployedContractCount = await workspace.getCumulativeDeployedContractCount(from, to);
    return cumulativeDeployedContractCount;
};

const getDeployedContractCount = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const deployedContractCount = await workspace.getDeployedContractCount(from, to);
    return deployedContractCount;
};

const getUniqueWalletCount = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const uniqueWalletCount = await workspace.getUniqueWalletCount(from, to);
    return uniqueWalletCount;
};

const getCumulativeWalletCount = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const cumulativeWalletCount = await workspace.getCumulativeWalletCount(from, to);
    return cumulativeWalletCount;
};

const getAverageGasPrice = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const avgGasPrice = await workspace.getAverageGasPrice(from, to);
    return avgGasPrice;
};

const getAverageTransactionFee = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const avgTransactionFee = await workspace.getAverageTransactionFee(from, to);
    return avgTransactionFee;
};

const getTransactionVolume = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const transactions = await workspace.getTransactionVolume(from, to);
    return transactions;
};

const getActiveWalletCount = async (workspaceId) => {
    if (!workspaceId) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.countActiveWallets();
};

const getTotalTxCount = async (workspaceId, since) => {
    if (!workspaceId) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getTransactionCount(since);
};

const getAddressLatestTokenBalances = async (workspaceId, address, tokenPatterns) => {
    if (!workspaceId|| !address) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    return await workspace.safeFindLatestTokenBalances(address, tokenPatterns);
};

const searchForAddress = async (workspaceId, address) => {
    if (!workspaceId || !address) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);
    return contract ? [{
        type: 'contract',
        data: contract.toJSON()
    }] : [];
};

const searchForHash = async (workspaceId, hash) => {
    if (!workspaceId || !hash) throw new Error('Missing parameter.');

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
};

const searchForNumber = async (workspaceId, number) => {
    if (!workspaceId || !number) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const block = await workspace.findBlockByNumber(number, true);
    return block ? [{
        type: 'block',
        data: block.toJSON()
    }] : [];
};

const searchForText = async (workspaceId, text) => {
    if (!workspaceId || !text) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const contracts = await workspace.findContractsByText(text);
    return contracts.map(c => ({
        type: 'contract',
        data: c.toJSON()
    }));
};

const getWorkspaceById = async (workspaceId) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId, {
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['firebaseUserId']
            },
            'explorer'
        ]
    });

    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.toJSON();
};

const getWorkspaceContractById = async (workspaceId, contractId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractById(contractId);
    return contract ? contract.toJSON() : null;
};

const getWorkspaceBlock = async (workspaceId, number) => {
    const workspace = await Workspace.findByPk(workspaceId, {
        include: {
            model: Explorer,
            as: 'explorer',
            include: {
                model: StripeSubscription,
                as: 'stripeSubscription',
                include: 'stripePlan'
            }
        }
    });

    const attributes = [
        'id', 'number', 'timestamp', 'gasUsed', 'transactionsCount', 'gasLimit', 'hash',
        [
            Sequelize.literal(`(
                SELECT COUNT(*)::INTEGER
                FROM transactions
                WHERE transactions."blockId" = "Block".id
                AND transactions.state = 'ready'
            )`), 'syncedTransactionCount'
        ]
    ];

    if (workspace.explorer)
        if (await workspace.explorer.canUseCapability('l1Explorer'))
            attributes.push('l1BlockNumber');

    const block = await Block.findOne({
        where: { number, workspaceId },
        attributes
    });

    return block ? block.toJSON() : null;
};

const getWorkspaceBlocks = async (workspaceId, page = 1, itemsPerPage = 10, order = 'DESC', withCount = 'true') => {
    const workspace = await Workspace.findByPk(workspaceId);
    const blocks = await workspace.getFilteredBlocks(page, itemsPerPage, order);
    let totalBlockCount;
    if (withCount == 'true')
        totalBlockCount = await workspace.countBlocks();

    return {
        items: blocks.map(b => b.toJSON()),
        total: totalBlockCount
    };
};

const getWorkspaceTransaction = async (workspaceId, hash) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const transaction = await workspace.findTransaction(hash);

    return transaction.toJSON();
};

const getBlockTransactions = async (workspaceId, blockNumber, page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'timestamp', withCount = 'true') => {
    if (!workspaceId || !blockNumber)
        throw new Error('Missing parameters');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Cannot find workspace');

    const sanitizedOrderBy = ['hash', 'timestamp', 'value', 'from', 'to'].indexOf(orderBy) > -1 ? [orderBy] : ['timestamp'];

    const fun = withCount == 'false' ? 'findAll' : 'findAndCountAll';
    const res = await Transaction[fun]({
        where: { blockNumber, workspaceId },
        attributes: ['blockNumber', 'from', 'gasPrice', 'hash', 'methodDetails', 'data', 'timestamp', 'to', 'value', 'workspaceId', 'state'],
        include: [
            {
                model: Block,
                as: 'block',
                attributes: ['number'],
            },
            {
                model: TransactionReceipt,
                as: 'receipt',
                attributes: ['gasUsed', 'status', 'contractAddress', [Sequelize.json('raw.root'), 'root'], 'gasUsed', 'cumulativeGasUsed', [Sequelize.json('raw.effectiveGasPrice'), 'effectiveGasPrice']]
            },
            {
                model: Contract,
                as: 'contract',
                attributes: ['tokenName', 'tokenSymbol', 'tokenDecimals', 'name'],
            }
        ],
        offset: (page - 1) * itemsPerPage,
        limit: itemsPerPage,
        order: [[...sanitizedOrderBy, order]]
    });

    return res.rows && res.count !== null && res.count != undefined ? { ...res } : { rows: res };
}

const getWorkspaceTransactions = async (workspaceId, page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'blockNumber', withCount = 'true') => {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Cannot find workspace');

    let totalTransactionCount;
    if (withCount == 'true')
        totalTransactionCount = await workspace.countTransactions();

    const transactions = await workspace.getFilteredTransactions(page, itemsPerPage, order, orderBy);

    return {
        items: transactions.map(t => t.toJSON()),
        total: totalTransactionCount
    };
};

const getAddressTransactions = async (workspaceId, address, page, itemsPerPage, order, orderBy) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const transactions = await workspace.getFilteredTransactions(page, itemsPerPage, order, orderBy, address);
    const totalTransactionCount = await workspace.countTransactions({
        where: { [Op.or]: [{ to: address.toLowerCase() }, { from: address.toLowerCase() }] }
    });
    return {
        items: transactions.map(t => t.toJSON()),
        total: totalTransactionCount
    };
};

const getWorkspaceContracts = async (userId, workspaceName, page, itemsPerPage, orderBy, order, pattern) => {
    const user = await User.findByAuthIdWithWorkspace(userId, workspaceName);
    const workspace = user.workspaces[0];
    const contracts = await workspace.getFilteredContracts(page, itemsPerPage, orderBy, order, pattern);
    const allowedPatterns = ['erc20', 'erc721'].indexOf(pattern) > -1 ? pattern : null;
    const contractCount = await workspace.countContracts({
        where: allowedPatterns ? { patterns: { [Op.contains]: [allowedPatterns] }} : {}
    });

    return {
        items: contracts.map(c => c.toJSON()),
        total: contractCount
    }
};

const getWorkspaceContract = async (userId, workspaceName, address) => {
    const user = await User.findByAuthIdWithWorkspace(userId, workspaceName);
    const contract = await user.workspaces[0].findContractByAddress(address);

    return contract ? contract.toJSON() : null;
};

const getUserById = async (id) => {
    const user = await User.findByPk(id);
    return user ? user.toJSON() : null;
};

const getUser = async (id, extraFields = []) => {
    const user = await User.findByAuthId(id, extraFields);
    return user ? user.toJSON() : null;
};

const createUser = async (uid, data) => {
    if (!uid || !data) throw new Error('Missing parameter.');

    const user = await User.safeCreate(uid, data.email, data.apiKey, data.stripeCustomerId, data.plan, data.explorerSubscriptionId, data.passwordHash, data.passwordSalt, data.qnId);
    return user ? user.toJSON() : null;
};

const getUserWorkspaces = async (userId) => {
    const user = await User.findByAuthId(userId);
    return user.workspaces.map(w => w.toJSON());
};

const addIntegration = async (userId, workspace, integration) => {
    if (!userId || !workspace || !integration) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    await user.workspaces[0].addIntegration(integration);
};

const removeIntegration = async (userId, workspace, integration) => {
    if (!userId || !workspace || !integration) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    await user.workspaces[0].removeIntegration(integration);
};

const createWorkspace = async (userId, data) => {
    if (!userId || !data) throw new Error('Missing parameter.');

    const user = await User.findByAuthId(userId);
    const workspace = await user.safeCreateWorkspace(data);
    return workspace ? workspace.toJSON() : null;
};

const getWorkspaceByName = async (userId, workspaceName) => {
    const user = await User.findByAuthIdWithWorkspace(userId, workspaceName);
    if (!user)
        return null;
    return user.workspaces && user.workspaces.length ? user.workspaces[0].toJSON() : null;
};

const storeBlock = async (userId, workspace, block) => {
    if (!userId || !workspace || !block) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const existingBlock = await user.workspaces[0].findBlockByNumber(block.number);

    if (existingBlock) {
        return null;
    }
    else {
        const newBlock = await user.workspaces[0].safeCreateBlock(block);
        return newBlock.toJSON();
    }
};

const storeTransaction = async (userId, workspace, transaction) => {
    if (!userId || !workspace || !transaction) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const block = await user.workspaces[0].findBlockByNumber(transaction.blockNumber);

    if (!block)
        throw new Error(`Couldn't find block`);

    const existingTransaction = await user.workspaces[0].findTransaction(transaction.hash);

    if (existingTransaction)
        return null;

    const newTransaction = await user.workspaces[0].safeCreateTransaction(transaction, block.id);
    return newTransaction.toJSON();
};

const storeTransactionTokenTransfers = async (userId, workspace, transactionHash, tokenTransfers) => {
    if (!userId || !workspace || !transactionHash || !tokenTransfers) throw new Error('Missing parameter.');
    
    if (tokenTransfers.length) {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const transaction = await user.workspaces[0].findTransaction(transactionHash);

        if (!transaction)
            throw new Error(`Couldn't find transaction`);

        for (let i = 0; i < tokenTransfers.length; i++)
            await transaction.safeCreateTokenTransfer(tokenTransfers[i]);
    }
};

const storeContractData = async (userId, workspace, address, data, transaction) => {
    if (!userId || !workspace || !address || !data) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const contract = await user.workspaces[0].safeCreateOrUpdateContract({ address: address, ...data }, transaction);
    return contract.toJSON();
};

const getContract = async (userId, workspaceId, address) => {
    if (!userId || !workspaceId || !address) throw new Error('Missing parameter.');

    const user = await User.findByPk(parseInt(userId));
    
    if (!user)
        return null;

    const workspaces = await user.getWorkspaces({ where: { id: workspaceId }});
    const contract = await workspaces[0].findContractByAddress(address);

    return contract ? contract.toJSON() : null;
};

const getContractData = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw new Error('Missing parameter.');
    
    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const contract = await user.workspaces[0].findContractByAddress(address);

    return contract ? contract.toJSON() : null;
};

const getContractByHashedBytecode = async (userId, workspace, hashedBytecode) => {
    if (!userId || !workspace || !hashedBytecode) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const contract = await user.workspaces[0].findContractByHashedBytecode(hashedBytecode);

    return contract ? contract.toJSON() : null;
};

const storeAccountPrivateKey = async (userId, workspace, address, privateKey) => {
    if (!userId || !workspace || !address || !privateKey) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const account = await user.workspaces[0].safeCreateOrUpdateAccount({ address: address, privateKey: privateKey });

    return account.toJSON();
};

const getAccounts = async (userId, workspaceName, page, itemsPerPage, orderBy, order) => {
    if (!userId || !workspaceName) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspaceName);
    const workspace = user.workspaces[0];

    const accounts = await workspace.getFilteredAccounts(page, itemsPerPage, orderBy, order);
    const count = await workspace.countAccounts();

    return {
        items: accounts.map(a => a.toJSON()),
        total: count
    };
};

const storeTrace = async (userId, workspace, txHash, trace) => {
    if (!userId || !workspace || !txHash || !trace) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const transaction = await user.workspaces[0].findTransaction(txHash);

    if (!transaction)
        throw new Error(`Couldn't find transaction`);

    return transaction.safeCreateTransactionTrace(trace);
};

const storeTransactionData = async (userId, workspace, hash, data) => {
    if (!userId || !workspace || !hash || !data) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const transaction = await user.workspaces[0].findTransaction(hash);

    if (!transaction)
        throw new Error(`Couldn't find transaction`);

    await transaction.safeUpdateStorage(data);
    return transaction.toJSON();
};

const storeTokenBalanceChanges = async (userId, workspace, tokenTransferId, changes) => {
    if (!userId || !workspace || !tokenTransferId || !changes) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const tokenTransfer = (await user.workspaces[0].getTokenTransfers({
        where: { id :tokenTransferId }
    }))[0];

    if (!tokenTransfer)
        throw new Error(`Couldn't find token transfer`);

    return changes.forEach(async change => await tokenTransfer.safeCreateBalanceChange(change));
};

const storeFailedTransactionError = async (userId, workspace, transactionHash, error) => {
    if (!userId || !workspace || !transactionHash || !error) throw new Error('Missing parameter.');

    if (error) {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const transaction = await user.workspaces[0].findTransaction(transactionHash);

        if (!transaction)
            throw new Error(`Couldn't find transaction`);

        await transaction.updateFailedTransactionError({
            parsed: error.parsed,
            message: error.message
        });

        return transaction.toJSON();
    }
};

const updateAccountBalance = async (userId, workspace, address, balance) => {
    if (!userId || !workspace || !address || !balance) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const account = await user.workspaces[0].safeCreateOrUpdateAccount({ address: address, balance: balance });

    return account.toJSON();
};

const setCurrentWorkspace = async (userId, name) => {
    if (!userId || !name) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, name);
    await user.update({ currentWorkspaceId: user.workspaces[0].id });

    return user.toJSON();
};

const removeContract = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    return user.workspaces[0].removeContractByAddress(address);
};

const updateWorkspaceSettings = async (userId, workspace, settings) => {
    if (!userId || !workspace || !settings) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const newWorkspace = await user.workspaces[0].updateSettings(settings);
    return newWorkspace.toJSON();
};

const resetWorkspace = async (userId, workspace, dayInterval) => {
    if (!userId || !String(workspace)) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, String(workspace));
    if (user && user.workspaces.length)
        await user.workspaces[0].reset(dayInterval);
};

const getUserbyStripeCustomerId = async (stripeCustomerId) => {
    if (!stripeCustomerId) throw new Error('Missing parameter.');

    const user = await User.findByStripeCustomerId(stripeCustomerId);
    return user ? user.toJSON() : null;
};

const getUnprocessedContracts = async (userId, workspace) => {
    if (!userId || !workspace) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const contracts = await user.workspaces[0].getUnprocessedContracts();
    return contracts.map(c => c.toJSON());
};

const isUserPremium = async (userId) => {
    if (!userId) throw new Error('Missing parameter.');

    const user = await User.findByAuthId(userId);;
    return user.isPremium;
};

const canUserSyncContract = async (userId, workspaceName, address) => {
    if (!userId) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspaceName);

    if (!user)
        throw new Error(`Couldn't find workspace "${workspaceName}".`);

    if (user.isPremium)
        return true;

    const workspace = user.workspaces[0];
    if (workspace.public)
        return true;

    // If the contract has already been synced we can update its data
    const existingContracts = await workspace.getContracts({ where: { address: address }});

    if (existingContracts.length > 0)
        return true;

    const contracts = await user.workspaces[0].getContracts();

    if (contracts.length >= 10)
        return false;
    else
        return true;
};

const getTransaction = async (userId, workspace, transactionHash) => {
    if (!userId || !workspace || !transactionHash) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    return user.workspaces[0].findTransaction(transactionHash);
};

const getProcessableTransactions = async (uid, workspace) => {
    if (!uid || !workspace) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(uid, workspace);
    const transactions = await user.workspaces[0].getProcessableTransactions();
    return transactions.map(t => t.toJSON());
};

const getFailedProcessableTransactions = async (uid, workspace) => {
    if (!uid || !workspace) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(uid, workspace);
    const transactions = await user.workspaces[0].getFailedProcessableTransactions();
    return transactions.map(t => t.toJSON());
};

const getPublicExplorerParamsBySlug = async (slug) => {
   if (!slug) throw new Error('Missing parameter.');

   const explorer = await Explorer.findBySlug(slug);
   return explorer ? explorer.toJSON() : null;
};

const getPublicExplorerParamsByDomain = async (domain) => {
   if (!domain) throw new Error('Missing parameter.');

   const explorer = await Explorer.findByDomain(domain);
   return explorer ? explorer.toJSON() : null;
};

const getContractDeploymentTxByAddress = async (userId, workspaceId, address) => {
    if (!userId || !workspaceId || !address) throw new Error('Missing parameter.');

    const user = await User.findByPk(userId);

    const workspaces = await user.getWorkspaces({ where: { id: workspaceId }});
    const transactions = await workspaces[0].getTransactions({
        where: { '$receipt.contractAddress$': address },
        include: 'receipt'
    });
    return transactions && transactions.length ? transactions[0].toJSON() : null;
};

const updateContractVerificationStatus = async (userId, workspaceId, contractAddress, status) => {
    if (!userId || !workspaceId || !contractAddress || !status) throw new Error('Missing parameter.');

    if (['success', 'pending', 'failed'].indexOf(status) === -1) return null;

    const user = await User.findByPk(userId);
    const workspaces = await user.getWorkspaces({ where: { id: workspaceId }});
    const contract = await workspaces[0].findContractByAddress(contractAddress);
    await contract.update({ verificationStatus: status });
    return contract.toJSON();
};

const updateUserPlan = async (userId, plan) => {
    if (!userId || !plan) throw new Error('Missing parameter.');

    if (['free', 'premium'].indexOf(plan) === -1)
        throw new Error('[updateUserPlan] Invalid plan');

    const user = await User.findByAuthId(userId);
    await user.update({ plan: plan });
    return user.toJSON();
};

const getContractTransactions = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const transactions = await user.workspaces[0].getTransactions({
        where: { to: address },
        include: {
            model: TransactionReceipt,
            as: 'receipt',
            include: 'logs'
        }
    });
    return transactions.map(t => t.toJSON());
}

module.exports = {
    storeBlock: storeBlock,
    storeTransaction: storeTransaction,
    storeContractData: storeContractData,
    getContractData: getContractData,
    getWorkspaceByName: getWorkspaceByName,
    getUser: getUser,
    addIntegration: addIntegration,
    removeIntegration: removeIntegration,
    storeAccountPrivateKey: storeAccountPrivateKey,
    storeTrace: storeTrace,
    getContractByHashedBytecode: getContractByHashedBytecode,
    createWorkspace: createWorkspace,
    updateAccountBalance: updateAccountBalance,
    setCurrentWorkspace: setCurrentWorkspace,
    updateWorkspaceSettings: updateWorkspaceSettings,
    getUserbyStripeCustomerId: getUserbyStripeCustomerId,
    getUserWorkspaces: getUserWorkspaces,
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
    getTotalTxCount: getTotalTxCount,
    getActiveWalletCount: getActiveWalletCount,
    getTransactionVolume: getTransactionVolume,
    setWorkspaceRemoteFlag: setWorkspaceRemoteFlag,
    storeErc721Token: storeErc721Token,
    getContractErc721Tokens: getContractErc721Tokens,
    getContractErc721Token: getContractErc721Token,
    getErc721TokenTransfers: getErc721TokenTransfers,
    updateErc721Token: updateErc721Token,
    getContractByWorkspaceId: getContractByWorkspaceId,
    storeContractDataWithWorkspaceId: storeContractDataWithWorkspaceId,
    getContractLogs: getContractLogs,
    getTokenTransfers: getTokenTransfers,
    getTokenStats: getTokenStats,
    getTokenHolders: getTokenHolders,
    getTokenTransferVolume: getTokenTransferVolume,
    getTokenCirculatingSupply: getTokenCirculatingSupply,
    getTokenHolderHistory: getTokenHolderHistory,
    getTokenTransferForProcessing: getTokenTransferForProcessing,
    getTransactionTokenTransfers: getTransactionTokenTransfers,
    getAddressStats: getAddressStats,
    getAddressTokenTransfers: getAddressTokenTransfers,
    getCustomTransactionFunction: getCustomTransactionFunction,
    getUserByEmail: getUserByEmail,
    setUserPassword: setUserPassword,
    updateUserFirebaseHash: updateUserFirebaseHash,
    updateBrowserSync: updateBrowserSync,
    createExplorer: createExplorer,
    syncFullBlock: syncFullBlock,
    syncPartialBlock: syncPartialBlock,
    getTransactionForProcessing: getTransactionForProcessing,
    updateWorkspaceIntegrityCheck: updateWorkspaceIntegrityCheck,
    updateWorkspaceRpcHealthCheck: updateWorkspaceRpcHealthCheck,
    revertPartialBlock: revertPartialBlock,
    getUserExplorers: getUserExplorers,
    getExplorerById: getExplorerById,
    updateExplorerSettings: updateExplorerSettings,
    updateExplorerWorkspace: updateExplorerWorkspace,
    updateExplorerBranding: updateExplorerBranding,
    getStripePlan: getStripePlan,
    storeContractVerificationData: storeContractVerificationData,
    getExplorerPlans: getExplorerPlans,
    createExplorerSubscription: createExplorerSubscription,
    updateExplorerSubscription: updateExplorerSubscription,
    cancelExplorerSubscription: cancelExplorerSubscription,
    deleteExplorerSubscription: deleteExplorerSubscription,
    getContractById: getContractById,
    revertExplorerSubscriptionCancelation: revertExplorerSubscriptionCancelation,
    createExplorerFromWorkspace: createExplorerFromWorkspace,
    deleteExplorer: deleteExplorer,
    createExplorerDomain: createExplorerDomain,
    deleteExplorerDomain: deleteExplorerDomain,
    getExplorerDomainById: getExplorerDomainById,
    disableUserTrial: disableUserTrial,
    storeTransactionReceipt: storeTransactionReceipt,
    getBlockTransactions: getBlockTransactions,
    deleteWorkspace: deleteWorkspace,
    canUserSyncBlock: canUserSyncBlock,
    resetFailedAttempts: resetFailedAttempts,
    incrementFailedAttempts: incrementFailedAttempts,
    stopExplorerSync: stopExplorerSync,
    startExplorerSync: startExplorerSync,
    createExplorerWithWorkspace: createExplorerWithWorkspace,
    migrateDemoExplorer: migrateDemoExplorer,
    makeExplorerDemo: makeExplorerDemo,
    resetExplorerTransactionQuota: resetExplorerTransactionQuota,
    workspaceNeedsBatchReset: workspaceNeedsBatchReset,
    getAverageGasPrice: getAverageGasPrice,
    getAverageTransactionFee: getAverageTransactionFee,
    getUniqueWalletCount: getUniqueWalletCount,
    getCumulativeWalletCount: getCumulativeWalletCount,
    getDeployedContractCount: getDeployedContractCount,
    getCumulativeDeployedContractCount: getCumulativeDeployedContractCount,
    findQuicknodeUser: findQuicknodeUser,
    findQuicknodeWorkspace: findQuicknodeWorkspace,
    findQuicknodeExplorer: findQuicknodeExplorer,
    updateQuicknodeSubscription: updateQuicknodeSubscription,
    createQuicknodeWorkspace: createQuicknodeWorkspace,
    markWorkspaceForDeletion: markWorkspaceForDeletion,
    getTransactionLogs: getTransactionLogs,
    Workspace: Workspace
};
