/**
 * @fileoverview Explorer model - represents a public block explorer instance.
 * An explorer is the public-facing configuration for a workspace,
 * including theming, domains, subscriptions, and features.
 *
 * @module models/Explorer
 *
 * @property {number} id - Primary key
 * @property {number} userId - Foreign key to admin user
 * @property {number} workspaceId - Foreign key to workspace
 * @property {string} name - Explorer display name
 * @property {string} slug - URL-friendly identifier
 * @property {number} chainId - Chain ID
 * @property {string} rpcServer - RPC endpoint
 * @property {Object} themes - UI theme configuration
 * @property {boolean} isDemo - Whether this is a demo explorer
 */

'use strict';
const {
  Model
} = require('sequelize');
const ethers = require('ethers');
const { sanitize, slugify } = require('../lib/utils');
const { isStripeEnabled } = require('../lib/flags');
const { getDemoUserId, getAppDomain } = require('../lib/env');
const { enqueue } = require('../lib/queue');
const Analytics = require('../lib/analytics');
const analytics = new Analytics();
const IUniswapV2Router02 = require('../lib/abis/IUniswapV2Router02.json');
const IUniswapV2Factory = require('../lib/abis/IUniswapV2Factory.json');
const MAX_RPC_ATTEMPTS = 3;

// Sync failure auto-disable configuration
const SYNC_FAILURE_THRESHOLD = 3;
const MAX_RECOVERY_ATTEMPTS = 10;
const RECOVERY_BACKOFF_SCHEDULE = [
    5 * 60 * 1000,       // 5 minutes
    15 * 60 * 1000,      // 15 minutes
    60 * 60 * 1000,      // 1 hour
    6 * 60 * 60 * 1000   // 6 hours (max)
];
// Stagger recovery checks to avoid thundering herd (random jitter up to 2 minutes)
const RECOVERY_JITTER_MAX = 2 * 60 * 1000;

module.exports = (sequelize, DataTypes) => {
  class Explorer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Explorer.belongsTo(models.User, { foreignKey: 'userId', as: 'admin' });
      Explorer.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      Explorer.hasOne(models.StripeSubscription, { foreignKey: 'explorerId', as: 'stripeSubscription' });
      Explorer.hasOne(models.ExplorerFaucet, { foreignKey: 'explorerId', as: 'faucet' });
      Explorer.hasOne(models.ExplorerV2Dex, { foreignKey: 'explorerId', as: 'v2Dex' });
      Explorer.hasMany(models.ExplorerDomain, { foreignKey: 'explorerId', as: 'domains' });
    }

    /**
     * Creates a new explorer with sanitized data.
     * @param {Object} explorer - Explorer configuration
     * @param {number} explorer.userId - Admin user ID
     * @param {number} explorer.workspaceId - Associated workspace ID
     * @param {number} explorer.chainId - Blockchain chain ID
     * @param {string} explorer.name - Explorer display name
     * @param {string} explorer.rpcServer - RPC endpoint URL
     * @param {string} explorer.slug - URL-friendly identifier
     * @returns {Promise<Explorer>} Created explorer instance
     */
    static safeCreateExplorer(explorer) {
        return Explorer.create(sanitize({
            userId: explorer.userId,
            workspaceId: explorer.workspaceId,
            chainId: explorer.chainId,
            name: explorer.name,
            rpcServer: explorer.rpcServer,
            slug: explorer.slug,
            themes: explorer.themes,
            totalSupply: explorer.totalSupply,
            domain: explorer.domain,
            token: explorer.token
        }));
    }

    /**
     * Finds an explorer by its URL slug with all related data.
     * Includes workspace, subscription, faucet, DEX, and domain info.
     * @param {string} slug - Explorer slug
     * @returns {Promise<Explorer|null>} Explorer with associations or null
     */
    static findBySlug(slug) {
        return Explorer.findOne({
            attributes: ['id', 'chainId', 'domain', 'name', 'rpcServer', 'slug', 'token', 'themes', 'userId', 'workspaceId', 'gasAnalyticsEnabled', 'isDemo', 'totalSupply', 'displayTopAccounts'],
            where: { slug },
            include: [
                {
                    model: sequelize.models.ExplorerDomain,
                    as: 'domains',
                    attrbutes: ['domain']
                },
                {
                    model: sequelize.models.StripeSubscription,
                    attributes: ['id', 'stripePlanId'],
                    as: 'stripeSubscription',
                    include: {
                        model: sequelize.models.StripePlan,
                        attributes: ['capabilities'],
                        as: 'stripePlan',
                    }
                },
                {
                    model: sequelize.models.User,
                    attributes: ['firebaseUserId'],
                    as: 'admin'
                },
                {
                    model: sequelize.models.Workspace,
                    attributes: [
                        'id', 'name', 'storageEnabled', 'defaultAccount', 'gasPrice', 'gasLimit', 'erc721LoadingEnabled', 'statusPageEnabled', 'public',
                        [sequelize.literal('CASE WHEN tracing IS NOT NULL THEN true ELSE false END'), 'tracing']
                    ],
                    as: 'workspace',
                    include: [
                        {
                            model: sequelize.models.CustomField,
                            as: 'packages',
                            attributes: ['function']
                        },
                        {
                            model: sequelize.models.CustomField,
                            as: 'functions',
                            attributes: ['function']
                        },
                        {
                            model: sequelize.models.OrbitChainConfig,
                            as: 'orbitConfig',
                            attributes: ['parentChainExplorer']
                        },
                        {
                            model: sequelize.models.OpChainConfig,
                            as: 'opConfig',
                            attributes: ['parentChainExplorer']
                        }
                    ]
                },
                {
                    model: sequelize.models.ExplorerFaucet,
                    as: 'faucet',
                    attributes: ['id', 'address', 'amount', 'interval', 'active'],
                    where: { active: true },
                    required: false
                },
                {
                    model: sequelize.models.ExplorerV2Dex,
                    as: 'v2Dex',
                    attributes: ['id', 'routerAddress', 'active'],
                    required: false
                }
            ]
        });
    }

    /**
     * Finds an explorer by custom domain with all related data.
     * @param {string} domain - Custom domain name
     * @returns {Promise<Explorer|null>} Explorer with associations or null
     */
    static async findByDomain(domain) {
        const explorerDomain = await sequelize.models.ExplorerDomain.findOne({
            where: { domain },
            attributes: ['domain'],
            include: [
                {
                    model: Explorer,
                    as: 'explorer',
                    attributes: ['id', 'chainId', 'domain', 'name', 'rpcServer', 'slug', 'token', 'themes', 'userId', 'workspaceId', 'gasAnalyticsEnabled', 'isDemo', 'totalSupply', 'displayTopAccounts'],
                    include: [
                        {
                            model: sequelize.models.StripeSubscription,
                            attributes: ['id', 'stripePlanId'],
                            as: 'stripeSubscription',
                            include: {
                                model: sequelize.models.StripePlan,
                                attributes: ['capabilities'],
                                as: 'stripePlan',
                            }
                        },
                        {
                            model: sequelize.models.User,
                            attributes: ['firebaseUserId'],
                            as: 'admin'
                        },
                        {
                            model: sequelize.models.Workspace,
                            attributes: [
                                'id', 'name', 'storageEnabled', 'defaultAccount', 'gasPrice', 'gasLimit', 'erc721LoadingEnabled', 'statusPageEnabled', 'public',
                                [sequelize.literal('CASE WHEN tracing IS NOT NULL THEN true ELSE false END'), 'tracing']
                            ],
                            as: 'workspace',
                            include: [
                                {
                                    model: sequelize.models.CustomField,
                                    as: 'packages',
                                    attributes: ['function']
                                },
                                {
                                    model: sequelize.models.CustomField,
                                    as: 'functions',
                                    attributes: ['function']
                                },
                                {
                                    model: sequelize.models.OrbitChainConfig,
                                    as: 'orbitConfig',
                                    attributes: ['parentChainExplorer']
                                },
                                {
                                    model: sequelize.models.OpChainConfig,
                                    as: 'opConfig',
                                    attributes: ['parentChainExplorer']
                                }
                            ]
                        },
                        {
                            model: sequelize.models.ExplorerFaucet,
                            as: 'faucet',
                            attributes: ['id', 'address', 'amount', 'interval', 'active'],
                            where: { active: true },
                            required: false
                        },
                        {
                            model: sequelize.models.ExplorerV2Dex,
                            as: 'v2Dex',
                            attributes: ['id', 'routerAddress', 'active'],
                            required: false
                        }
                    ]
                }
            ]
        });
        if (!explorerDomain)
            return null;

        const explorer = explorerDomain.explorer;

        if (explorer)
            return explorer.stripeSubscription && explorer.stripeSubscription.stripePlan.capabilities.customDomain ? explorer : null;
        else
            return Explorer.findOne({
                attributes: ['id', 'chainId', 'domain', 'name', 'rpcServer', 'slug', 'token', 'themes', 'totalSupply', 'displayTopAccounts'],
                where: { domain: domain },
                include: [
                    {
                        model: sequelize.models.StripeSubscription,
                        attributes: ['id', 'stripePlanId'],
                        as: 'stripeSubscription',
                        include: {
                            model: sequelize.models.StripePlan,
                            attributes: ['capabilities'],
                            as: 'stripePlan',
                        }
                    },
                    {
                        model: sequelize.models.User,
                        attributes: ['firebaseUserId'],
                        as: 'admin'
                    },
                    {
                        model: sequelize.models.Workspace,
                        attributes: [
                            'id', 'name', 'storageEnabled', 'defaultAccount', 'gasPrice', 'gasLimit', 'erc721LoadingEnabled', 'statusPageEnabled', 'public',
                            [sequelize.literal('CASE WHEN tracing IS NOT NULL THEN true ELSE false END'), 'tracing']
                        ],
                        as: 'workspace',
                        include: [
                            {
                                model: sequelize.models.CustomField,
                                as: 'packages',
                                attributes: ['function']
                            },
                            {
                                model: sequelize.models.CustomField,
                                as: 'functions',
                                attributes: ['function']
                            },
                            {
                                model: sequelize.models.OrbitChainConfig,
                                as: 'orbitConfig',
                                attributes: ['parentChainExplorer']
                            }
                        ]
                    },
                    {
                        model: sequelize.models.ExplorerFaucet,
                        as: 'faucet',
                        attributes: ['id', 'address', 'amount', 'interval', 'active'],
                        where: { active: true },
                        required: false
                    },
                    {
                        model: sequelize.models.ExplorerV2Dex,
                        as: 'v2Dex',
                        attributes: ['id', 'routerAddress', 'active'],
                        required: false
                    }
                ]
            });
    }

    /**
     * Starts block synchronization for the explorer.
     * Resets all failure tracking when manually enabling sync.
     * @returns {Promise<Explorer>} Updated explorer
     */
    async startSync() {
        await this.update({
            shouldSync: true,
            syncFailedAttempts: 0,
            syncDisabledAt: null,
            syncDisabledReason: null,
            recoveryAttempts: 0,
            nextRecoveryCheckAt: null
        });
        return this;
    }

    /**
     * Stops block synchronization for the explorer.
     * @returns {Promise<Explorer>} Updated explorer
     */
    stopSync() {
        return this.update({ shouldSync: false });
    }

    /**
     * Increments the sync failure counter and auto-disables if threshold reached.
     * Uses atomic increment to avoid race conditions.
     * @param {string} [reason='rpc_unreachable'] - Reason for the failure
     * @returns {Promise<{disabled: boolean, attempts: number}>} Result with disable status
     */
    async incrementSyncFailures(reason = 'rpc_unreachable') {
        // Use atomic increment to avoid race conditions
        await this.increment('syncFailedAttempts');
        await this.reload();

        if (this.syncFailedAttempts >= SYNC_FAILURE_THRESHOLD) {
            await this.autoDisableSync(reason);
            return { disabled: true, attempts: this.syncFailedAttempts };
        }
        return { disabled: false, attempts: this.syncFailedAttempts };
    }

    /**
     * Auto-disables sync and schedules first recovery check.
     * Adds random jitter to avoid thundering herd when many explorers are disabled at once.
     * @param {string} reason - Reason for disabling (e.g., 'rpc_unreachable')
     * @returns {Promise<Explorer>} Updated explorer
     */
    async autoDisableSync(reason) {
        // Add random jitter to stagger recovery checks
        const jitter = Math.floor(Math.random() * RECOVERY_JITTER_MAX);
        const nextCheck = new Date(Date.now() + RECOVERY_BACKOFF_SCHEDULE[0] + jitter);
        await this.update({
            shouldSync: false,
            syncDisabledAt: new Date(),
            syncDisabledReason: reason,
            recoveryAttempts: 0,
            nextRecoveryCheckAt: nextCheck
        });
        return this;
    }

    /**
     * Schedules the next recovery check using exponential backoff.
     * Increments recovery attempts and returns null if max attempts reached.
     * Backoff schedule: 5m -> 15m -> 1h -> 6h (max)
     * @returns {Promise<{scheduled: boolean, attempts: number, maxReached: boolean}>} Result
     */
    async scheduleNextRecoveryCheck() {
        if (!this.syncDisabledAt) {
            return { scheduled: false, attempts: 0, maxReached: false };
        }

        const newAttempts = (this.recoveryAttempts || 0) + 1;

        // Check if max recovery attempts reached
        if (newAttempts >= MAX_RECOVERY_ATTEMPTS) {
            await this.update({
                recoveryAttempts: newAttempts,
                nextRecoveryCheckAt: null,
                syncDisabledReason: 'max_recovery_attempts_reached'
            });
            return { scheduled: false, attempts: newAttempts, maxReached: true };
        }

        // Use recovery attempts as index, capped at max backoff
        const backoffIndex = Math.min(newAttempts - 1, RECOVERY_BACKOFF_SCHEDULE.length - 1);
        // Add random jitter to stagger recovery checks
        const jitter = Math.floor(Math.random() * RECOVERY_JITTER_MAX);
        const nextCheck = new Date(Date.now() + RECOVERY_BACKOFF_SCHEDULE[backoffIndex] + jitter);

        await this.update({
            recoveryAttempts: newAttempts,
            nextRecoveryCheckAt: nextCheck
        });
        return { scheduled: true, attempts: newAttempts, maxReached: false };
    }

    /**
     * Re-enables sync after successful recovery check.
     * @returns {Promise<Explorer>} Updated explorer
     */
    async enableSyncAfterRecovery() {
        await this.update({
            shouldSync: true,
            syncFailedAttempts: 0,
            syncDisabledAt: null,
            syncDisabledReason: null,
            recoveryAttempts: 0,
            nextRecoveryCheckAt: null
        });
        return this;
    }

    /**
     * Creates a Uniswap V2 compatible DEX for the explorer.
     * @param {string} routerAddress - DEX router contract address
     * @param {string} factoryAddress - DEX factory contract address
     * @param {string} wrappedNativeTokenAddress - WETH/WBNB contract address
     * @returns {Promise<ExplorerV2Dex>} Created DEX instance
     * @throws {Error} If explorer already has a DEX
     */
    async safeCreateV2Dex(routerAddress, factoryAddress, wrappedNativeTokenAddress) {
        if (!routerAddress || !factoryAddress || !wrappedNativeTokenAddress)
            throw new Error('Missing parameter');

        const dex = await this.getV2Dex();
        if (dex)
            throw new Error('This explorer already has a dex.');

        let [routerContract] = await sequelize.models.Contract.findOrCreate({
            where: {
                workspaceId: this.workspaceId,
                address: routerAddress.toLowerCase()
            }
        });
        const routerContractProperties = sanitize({
            abi: routerContract.abi ? routerContract.abi : IUniswapV2Router02,
            name: routerContract.name ? routerContract.name : 'UniswapV2Router'
        });
        await routerContract.update(routerContractProperties);

        let [factoryContract] = await sequelize.models.Contract.findOrCreate({
            where: {
                workspaceId: this.workspaceId,
                address: factoryAddress.toLowerCase()
            }
        });
        const factoryContractProperties = sanitize({
            abi: factoryContract.abi ? factoryContract.abi : IUniswapV2Factory,
            name: factoryContract.name ? factoryContract.name : 'UniswapV2Factory'
        });
        await factoryContract.update(factoryContractProperties);

        const [wrappedNativeTokenContract] = await sequelize.models.Contract.findOrCreate({
            where: {
                workspaceId: this.workspaceId,
                address: wrappedNativeTokenAddress.toLowerCase()
            }
        });

        return this.createV2Dex({
            routerAddress, factoryAddress,
            explorerId: this.id,
            wrappedNativeTokenContractId: wrappedNativeTokenContract.id
        });
    }

    /**
     * Creates a faucet for the explorer with a generated wallet.
     * @param {string} amount - Amount to dispense per request
     * @param {number} interval - Cooldown interval between requests
     * @param {Object} [transaction] - Sequelize transaction
     * @returns {Promise<ExplorerFaucet>} Created faucet instance
     * @throws {Error} If explorer already has a faucet
     */
    async safeCreateFaucet(amount, interval, transaction) {
        if (!amount || !interval)
            throw new Error('Missing parameter');

        const faucet = await this.getFaucet();
        if (faucet)
            throw new Error('This explorer already has a faucet.');

        const { address, privateKey } = ethers.Wallet.createRandom();
        return this.createFaucet({ address, privateKey, amount, interval, active: true }, { transaction });
    }

    /**
     * Checks if the explorer is active with valid subscription.
     * @returns {Promise<boolean>} True if active and within quota
     */
    async isActive() {
        const subscription = await this.getStripeSubscription();
        const hasReachedTransactionQuota = await this.hasReachedTransactionQuota();

        return subscription && subscription.status == 'active' && !hasReachedTransactionQuota;
    }

    /**
     * Gets the transaction quota for this explorer.
     * @returns {Promise<number>} Transaction quota limit
     */
    async getTransactionQuota() {
        if (!this.shouldEnforceQuota)
            return 0;

        try {
            const stripeSubscription = await this.getStripeSubscription({ include: ['stripePlan', 'stripeQuotaExtension']});
            if (!stripeSubscription)
                return 0;

            const extraQuota = stripeSubscription.stripeQuotaExtension && stripeSubscription.stripeQuotaExtension.quota;

            return stripeSubscription.stripePlan.capabilities.txLimit + extraQuota;
        } catch (error) {
            // Handle database connection errors gracefully
            if (error.name === 'SequelizeDatabaseError' || error.name === 'SequelizeConnectionError') {
                console.warn(`Database connection error in getTransactionQuota for explorer ${this.id}: ${error.message}`);
                // Return 0 as safe default when quota cannot be determined
                return 0;
            }
            // Re-throw other unexpected errors
            throw error;
        }
    }

    /**
     * Checks if transaction quota has been reached.
     * @returns {Promise<boolean>} True if quota exceeded
     */
    async hasReachedTransactionQuota() {
        if (!this.shouldEnforceQuota)
            return false;

        try {
            const stripeSubscription = await this.getStripeSubscription({ include: ['stripePlan', 'stripeQuotaExtension']});
            if (!stripeSubscription)
                return false;

            const baseQuota = stripeSubscription.stripePlan.capabilities.txLimit;
            const extraQuota = stripeSubscription.stripeQuotaExtension && stripeSubscription.stripeQuotaExtension.quota;
            return baseQuota > 0 && stripeSubscription.transactionQuota > baseQuota + extraQuota;
        } catch (error) {
            // Handle database connection errors gracefully
            if (error.name === 'SequelizeDatabaseError' || error.name === 'SequelizeConnectionError') {
                console.warn(`Database connection error in hasReachedTransactionQuota for explorer ${this.id}: ${error.message}`);
                // Return false (quota not reached) as safe default to avoid disrupting sync processes
                return false;
            }
            // Re-throw other unexpected errors
            throw error;
        }
    }

    /**
     * Checks if RPC has too many failed health check attempts.
     * @returns {Promise<boolean>} True if within allowed attempts
     */
    async hasTooManyFailedAttempts() {
        const workspace = await this.getWorkspace({ include: 'rpcHealthCheck' });
        if (workspace.rpcHealthCheck && workspace.rpcHealthCheck.failedAttempts <= MAX_RPC_ATTEMPTS)
            return true;
        return false;
    }

    /**
     * Creates a custom domain for the explorer.
     * @param {string} domain - Custom domain name
     * @param {Object} [transaction] - Sequelize transaction
     * @returns {Promise<ExplorerDomain>} Created domain
     * @throws {Error} If domain is already in use
     */
    async safeCreateDomain(domain, transaction) {
        if (!domain) throw new Error('Missing parameter');

        const existingDomain = await sequelize.models.ExplorerDomain.findOne({
            where: { domain }
        });

        if (existingDomain)
            throw new Error('This domain is already used.');

        return this.createDomain({ domain }, { transaction });
    }

    /**
     * Creates a Stripe subscription for the explorer.
     * @param {number} stripePlanId - Stripe plan ID
     * @param {string} stripeId - Stripe subscription ID
     * @param {Date} cycleEndsAt - Billing cycle end date
     * @param {string} status - Subscription status (active, trial, trial_with_card)
     * @returns {Promise<StripeSubscription>} Created subscription
     */
    safeCreateSubscription(stripePlanId, stripeId, cycleEndsAt, status) {
        if (!stripePlanId || !cycleEndsAt || !status) throw new Error('Missing parameter');

        if (['active', 'trial', 'trial_with_card'].indexOf(status) == -1)
            throw new Error('Invalid subscription status');

        return this.createStripeSubscription({ stripePlanId, stripeId, cycleEndsAt, status });
    }

    /**
     * Migrates a demo explorer to a real user.
     * @param {number} userId - Target user ID
     * @param {Object} stripeSubscriptionData - Subscription data
     * @returns {Promise<Explorer>} Updated explorer
     */
    async migrateDemoTo(userId, stripeSubscriptionData) {
        if  (!userId || !stripeSubscriptionData) throw new Error('Missing parameter');

        const workspace = await this.getWorkspace();
        if (!workspace)
            throw new Error('Cannot find workspace.');

        if (workspace.userId != getDemoUserId() || this.userId != getDemoUserId())
            throw new Error('Not allowed');

        const stripePlan = await sequelize.models.StripePlan.findOne({ where: { stripePriceId: stripeSubscriptionData.plan.id}});
        if (!stripePlan)
            throw new Error('Invalid plan');

        return sequelize.transaction(async transaction => {
            const newUser = await sequelize.models.User.findByPk(userId);
            const dataRetentionLimit = stripePlan.capabilities.txLimit || 0;

            await newUser.update({ currentWorkspaceId: workspace.id }, { transaction });
            await workspace.update({ userId, dataRetentionLimit }, { transaction });
            await this.update({ userId, themes: { light: {} }, isDemo: false }, { transaction });

            return this;
        });
    }

    async canUseCapability(capability) {
        if (['customDomain', 'branding', 'nativeToken', 'totalSupply', 'statusPage'].indexOf(capability) < 0)
            return false;
        
        if (!isStripeEnabled())
            return true;

        const subscription = await this.getStripeSubscription({
            include: 'stripePlan'
        });

        return subscription && subscription.stripePlan.capabilities[capability];
    }

    async safeDelete(opts = { deleteSubscription: false }) {
        const stripeSubscription = await this.getStripeSubscription();
        if (
            !stripeSubscription ||
            stripeSubscription && stripeSubscription.isPendingCancelation ||
            stripeSubscription && opts.deleteSubscription ||
            !isStripeEnabled()
        ) {
            const transaction = await sequelize.transaction();
            try {
                if (stripeSubscription && opts.deleteSubscription)
                    await stripeSubscription.destroy({ transaction });

                const domains = await this.getDomains();
                for (let i = 0; i < domains.length; i++)
                    await domains[i].destroy({ transaction });
                if (stripeSubscription)
                    await stripeSubscription.destroy({ transaction });

                const workspace = await this.getWorkspace();
                await workspace.update({ public: false, rpcHealthCheckEnabled: false, integrityCheckStartBlockNumber: null }, { transaction });

                const faucet = await this.getFaucet();
                if (faucet)
                    await faucet.safeDestroy(transaction);

                const dex = await this.getV2Dex();
                if (dex)
                    await dex.safeDestroy(transaction);

                await this.destroy({ transaction });

                await transaction.commit();
            } catch(error) {
                await transaction.rollback();
                throw error;
            }
        } else if (stripeSubscription.isActive)
            throw new Error(`Can't delete explorer with an active subscription. Cancel it and wait until the end of the billing period.`);
        else
            throw new Error('Error deleting the explorer. Please retry');
    }

    async resetTransactionQuota() {
        const stripeSubscription = await this.getStripeSubscription();
        return stripeSubscription.update({ transactionQuota: 0 });
    }

    async safeUpdateSubscription(stripePlanId, stripeId, cycleEndsAt, status) {
        if (!stripePlanId || !cycleEndsAt || !status) throw new Error('Missing parameter');

        if (sequelize.models.StripeSubscription.rawAttributes.status.values.indexOf(status) == -1)
            throw new Error('Invalid subscription status');

        const stripeSubscription = await this.getStripeSubscription();

        return stripeSubscription.update(sanitize({ stripePlanId, stripeId, cycleEndsAt, status }));
    }

    async safeCancelSubscription() {
        const stripeSubscription = await this.getStripeSubscription();
        if (stripeSubscription)
            return stripeSubscription.update({ status: 'pending_cancelation' });
    }

    async safeRevertSubscriptionCancelation() {
        const stripeSubscription = await this.getStripeSubscription();
        if (stripeSubscription)
            return stripeSubscription.update({ status: 'active' });
    }

    async safeDeleteSubscription() {
        const stripeSubscription = await this.getStripeSubscription();
        if (stripeSubscription)
            return stripeSubscription.destroy();
    }

    async safeUpdateSettings(settings) {
        const ALLOWED_SETTINGS = ['name', 'slug', 'token', 'totalSupply', 'rpcServer'];

        const filteredSettings = {};
        Object.keys(settings).forEach(key => {
            if (ALLOWED_SETTINGS.indexOf(key) > -1)
                filteredSettings[key] = settings[key];
        });

        if (Object.keys(filteredSettings).length > 0) {
            if (filteredSettings['token']) {
                const isNativeTokenAllowed = await this.canUseCapability('nativeToken');
                if (!isNativeTokenAllowed)
                    throw new Error('Upgrade your plan to customize your native token symbol.');
            }

            if (filteredSettings['totalSupply']) {
                const isTotalSupplyAllowed = await this.canUseCapability('totalSupply');
                if (!isTotalSupplyAllowed)
                    throw new Error('Upgrade your plan to display a total supply.');
            }

            if (filteredSettings['slug'] && filteredSettings['slug'] != this.slug) {
                const existingExplorer = await sequelize.models.Explorer.findOne({ where: { slug: filteredSettings['slug'] }});
                if (existingExplorer)
                    throw new Error('This domain is not available');
                filteredSettings['slug'] = slugify(filteredSettings['slug']);
            }

            return this.update(filteredSettings);
        }
    }

    async safeUpdateBranding(branding, transaction) {
        const ALLOWED_OPTIONS = ['light', 'logo', 'favicon', 'font', 'links', 'banner'];
        const ALLOWED_COLORS = ['primary', 'secondary', 'accent', 'error', 'info', 'success', 'warning', 'background'];

        const filteredOptions = {};
        Object.keys(branding).forEach(key => {
            if (ALLOWED_OPTIONS.indexOf(key) > -1)
                filteredOptions[key] = branding[key];
        });

        if (filteredOptions['light']) {
            const filteredColors = {};
            Object.keys(filteredOptions['light']).forEach(key => {
                if (ALLOWED_COLORS.indexOf(key) > -1)
                    filteredColors[key] = filteredOptions['light'][key];
            });
            filteredOptions['light'] = filteredColors;
        }

        if (filteredOptions['links'] && filteredOptions['links'].length) {
            const links = [];
            for (let i = 0; i < filteredOptions['links'].length; i++) {
                const link = filteredOptions['links'][i];
                if (link.uid)
                    links.push(link);
                else
                    links.push({ ...link, uid: Math.floor(Math.random() * 10000 )});
            }
            filteredOptions['links'] = links;
        }

        return this.update({ themes: { ...this.themes, ...filteredOptions }}, { transaction });
    }
  }
  Explorer.init({
    userId: DataTypes.INTEGER,
    workspaceId: DataTypes.INTEGER,
    chainId: DataTypes.INTEGER,
    domain: {
        type: DataTypes.STRING,
        get() {
            return `${this.getDataValue('slug')}.${getAppDomain()}`;
        }
    },
    name: DataTypes.STRING,
    rpcServer: DataTypes.STRING,
    slug: DataTypes.STRING,
    themes: DataTypes.JSON,
    token: DataTypes.STRING,
    totalSupply: DataTypes.STRING,
    shouldSync: DataTypes.BOOLEAN,
    shouldEnforceQuota: DataTypes.BOOLEAN,
    isDemo: DataTypes.BOOLEAN,
    gasAnalyticsEnabled: DataTypes.BOOLEAN,
    displayTopAccounts: DataTypes.BOOLEAN,
    syncFailedAttempts: DataTypes.INTEGER,
    syncDisabledAt: DataTypes.DATE,
    syncDisabledReason: DataTypes.STRING,
    recoveryAttempts: DataTypes.INTEGER,
    nextRecoveryCheckAt: DataTypes.DATE
  }, {
    hooks: {
        afterCreate(explorer, options) {
            const afterCreateFn = () => {
                if (!explorer.isDemo) {
                    analytics.track(explorer.userId, 'explorer:explorer_create', {
                        is_demo: false
                    });
                    analytics.shutdown();
                }
            };
            return options.transaction ? options.transaction.afterCommit(afterCreateFn) : afterCreateFn();
        },
        afterUpdate(explorer, options) {
            const afterUpdateFn = () => {
                return enqueue('updateExplorerSyncingProcess', `updateExplorerSyncingProcess-${explorer.slug}`, {
                    explorerSlug: explorer.slug
                });
            };
            return options.transaction ? options.transaction.afterCommit(afterUpdateFn) : afterUpdateFn();
        },
        afterDestroy(explorer, options) {
            const afterDestroyFn = () => {
                return enqueue('updateExplorerSyncingProcess', `updateExplorerSyncingProcess-${explorer.slug}`, {
                    explorerSlug: explorer.slug
                  });
            };
            return options.transaction ? options.transaction.afterCommit(afterDestroyFn) : afterDestroyFn();
        }
    },
    sequelize,
    modelName: 'Explorer',
    tableName: 'explorers'
  });
  return Explorer;
};