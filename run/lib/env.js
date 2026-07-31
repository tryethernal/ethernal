/**
 * @fileoverview Environment variable accessors.
 * Provides typed getters for all environment variables used in the application.
 * Centralizes environment configuration to avoid direct process.env access.
 * @module lib/env
 */

module.exports = {
    /** @returns {string} Application domain (e.g., 'ethernal.io') */
    getAppDomain: () => process.env.APP_DOMAIN,
    getDefaultPlanSlug: () => process.env.DEFAULT_PLAN_SLUG,
    getAppUrl: () => process.env.APP_URL || (process.env.APP_DOMAIN ? `https://app.${process.env.APP_DOMAIN}` : undefined),
    getScannerKey: (scanner) => process.env[`${scanner}_API_TOKEN`],
    getNodeEnv: () => process.env.NODE_ENV,
    getGhostApiKey: () => process.env.GHOST_API_KEY,
    getGhostEndpoint: () => process.env.GHOST_ENDPOINT,
    getPm2Host: () => process.env.PM2_HOST,
    getPm2Secret: () => process.env.PM2_SECRET,
    getDemoUserId: () => process.env.DEMO_USER_ID,
    getDemoTrialSlug: () => process.env.DEMO_TRIAL_SLUG,
    getStripeSecretKey: () => process.env.STRIPE_SECRET_KEY,
    getStripeWebhookSecret: () => process.env.STRIPE_WEBHOOK_SECRET,
    getDefaultExplorerTrialDays: () => process.env.DEFAULT_EXPLORER_TRIAL_DAYS || 7,
    getPostHogApiKey: () => process.env.POST_HOG_API_KEY,
    getPostHogApiHost: () => process.env.POST_HOG_API_HOST,
    getMaxBlockForSyncReset: () => parseInt(process.env.MAX_BLOCK_FOR_SYNC_RESET) || 10,
    getMaxContractForReset: () => parseInt(process.env.MAX_CONTRACT_FOR_RESET) || 5,
    getWorkspaceResetPageSize: () => parseInt(process.env.WORKSPACE_RESET_PAGE_SIZE) || 10000,
    getFreeTierDefaultRetentionDays: () => parseInt(process.env.FREE_TIER_DEFAULT_RETENTION_DAYS) || 7,
    getEncryptionKey: () => process.env.ENCRYPTION_KEY,
    getEncryptionJwtSecret: () => process.env.ENCRYPTION_JWT_SECRET,
    getQuicknodeCredentials: () => process.env.QUICKNODE_CREDENTIALS,
    getSoketiDefaultAppId: () => process.env.SOKETI_DEFAULT_APP_ID,
    getSoketiDefaultAppKey: () => process.env.SOKETI_DEFAULT_APP_KEY,
    getSoketiDefaultAppSecret: () => process.env.SOKETI_DEFAULT_APP_SECRET,
    getSoketiHost: () => process.env.SOKETI_HOST,
    getSoketiPort: () => process.env.SOKETI_PORT,
    getSoketiScheme: () => process.env.SOKETI_SCHEME,
    getSoketiUseTLS: () => process.env.SOKETI_USE_TLS,
    getDiscordFeedbackChannelWebhook: () => process.env.DISCORD_FEEDBACK_CHANNEL_WEBHOOK,
    getMaxV2DexPairsForTrial: () => process.env.MAX_V2_DEX_PAIRS_FOR_TRIAL || 20,
    getSentryDsn: () => process.env.SENTRY_DSN,
    /**
     * Trace sample rates, tunable without a release so the span budget can be
     * corrected from `fly secrets set` when traffic shifts.
     *
     * Defaults are sized against a 5M spans/month quota at roughly 3.8M queue
     * jobs and 40k user-facing API requests a day, which lands near 1.9M
     * spans/month. Raise the API rate first — it is the one worth paying for.
     *
     * @returns {number} Fraction of traces to keep, 0 to 1.
     */
    getSentryApiSampleRate: () => parseFloat(process.env.SENTRY_API_SAMPLE_RATE || '0.05'),
    /** @returns {number} Sample rate for background queue jobs, 0 to 1. */
    getSentryQueueSampleRate: () => parseFloat(process.env.SENTRY_QUEUE_SAMPLE_RATE || '0.001'),
    /** @returns {number} Sample rate for everything else, 0 to 1. */
    getSentryDefaultSampleRate: () => parseFloat(process.env.SENTRY_DEFAULT_SAMPLE_RATE || '0.01'),
    getVersion: () => process.env.VERSION,
    getRedisUrl: () => process.env.REDIS_URL,
    /**
     * IP family to use when resolving the Redis host.
     * Returns a Number because net.connect() ignores a string value, which
     * would silently fall back to IPv4 and fail against an IPv6-only host.
     * @returns {number|undefined} 4, 6, or undefined when unset
     */
    getRedisFamily: () => (process.env.REDIS_FAMILY ? parseInt(process.env.REDIS_FAMILY, 10) : undefined),
    queueMonitoringMaxProcessingTime: () => parseInt(process.env.QUEUE_MONITORING_MAX_PROCESSING_TIME) || 60,
    queueMonitoringHighProcessingTimeThreshold: () => parseInt(process.env.QUEUE_MONITORING_HIGH_PROCESSING_TIME_THRESHOLD) || 20,
    // Backlog thresholds must sit above the per-workspace queue cap
    // (queueCapBlockSync, 200) — otherwise a single workspace backfilling within
    // its allowance trips the pager. Bulk backfills legitimately burst into the
    // thousands and drain within a few minutes; only a *sustained* breach
    // (see queueMonitoringBreachesBeforeAlert) is actionable.
    queueMonitoringHighWaitingJobCountThreshold: () => parseInt(process.env.QUEUE_MONITORING_HIGH_WAITING_JOB_COUNT_THRESHOLD) || 500,
    queueMonitoringMaxWaitingJobCount: () => parseInt(process.env.QUEUE_MONITORING_MAX_WAITING_JOB_COUNT) || 5000,
    /**
     * Number of consecutive breached samples required before paging.
     * The monitoring job runs every 120s, so the default of 3 means a condition
     * must hold for ~6 minutes. This is what distinguishes a draining burst
     * from a genuinely stuck queue.
     */
    queueMonitoringBreachesBeforeAlert: () => parseInt(process.env.QUEUE_MONITORING_BREACHES_BEFORE_ALERT) || 3,
    queueCapBlockSync: () => parseInt(process.env.QUEUE_CAP_BLOCKSYNC) || 200,
    queueCapReceiptSync: () => parseInt(process.env.QUEUE_CAP_RECEIPTSYNC) || 5000,
    queueCapTierCacheTtlSeconds: () => parseInt(process.env.QUEUE_CAP_TIER_CACHE_TTL_S) || 60,
    maxTimeWithoutEnqueuedJob: () => parseInt(process.env.MAX_TIME_WITHOUT_ENQUEUED_JOB) || 60,
    maxBlockNumberDiff: () => parseInt(process.env.MAX_BLOCK_NUMBER_DIFF) || 10,
    getOpsgenieApiKey: () => process.env.OPSGENIE_API_KEY,
    getCounterNamespace: () => process.env.COUNTER_NAMESPACE,
    whitelistedNetworkIdsForDemo: () => process.env.WHITELISTED_NETWORK_IDS_FOR_DEMO,
    maxDemoExplorersForNetwork: () => parseInt(process.env.MAX_DEMO_EXPLORERS_FOR_NETWORK) || 3,
    getBullboardUsername: () => process.env.BULLBOARD_USERNAME,
    getBullboardPassword: () => process.env.BULLBOARD_PASSWORD,
    getSecret: () => process.env.SECRET,
    getAuthSecret: () => process.env.AUTH_SECRET,
    getHistoricalBlocksProcessingConcurrency: () => parseInt(process.env.HISTORICAL_BLOCKS_PROCESSING_CONCURRENCY) || 50,
    getFirebaseSignerKey: () => process.env.FIREBASE_SIGNER_KEY,
    getFirebaseSaltSeparator: () => process.env.FIREBASE_SALT_SEPARATOR,
    getFirebaseRounds: () => parseInt(process.env.FIREBASE_ROUNDS),
    getFirebaseMemCost: () => parseInt(process.env.FIREBASE_MEM_COST),
    getLogLevel: () => process.env.LOG_LEVEL || 'info',
    getApproximatedApiKey: () => process.env.APPROXIMATED_API_KEY,
    getApproximatedTargetIp: () => process.env.APPROXIMATED_TARGET_IP,
    getGoogleApiKey: () => process.env.GOOGLE_API_KEY,
    getProductRoadToken: () => process.env.PRODUCT_ROAD_TOKEN,
    getStripePremiumPriceId: () => process.env.STRIPE_PREMIUM_PRICE_ID,
    getMaxNumberToInsert: () => parseInt(process.env.MAX_NUMBER_TO_INSERT || 1),
    getDemoExplorerSender: () => process.env.DEMO_EXPLORER_SENDER,
    getDiscordDemoExplorerChannelWebhook: () => process.env.DISCORD_DEMO_EXPLORER_CHANNEL_WEBHOOK,
    getMailjetPublicKey: () => process.env.MAILJET_PUBLIC_KEY,
    getMailjetPrivateKey: () => process.env.MAILJET_PRIVATE_KEY,
    getMailjetSender: () => process.env.MAILJET_SENDER,
    getMailjetWebhookSecret: () => process.env.MAILJET_WEBHOOK_SECRET,
    getMailjetNewsletterListId: () => process.env.MAILJET_NEWSLETTER_LIST_ID,
    getDripUnsubscribeSecret: () => process.env.DRIP_UNSUBSCRIBE_SECRET,
    getGithubToken: () => process.env.GITHUB_TOKEN,
    /**
     * Whether to alert on streaming replication and WAL archiving health.
     * Defaults to enabled: a silently dead replica means no standby and no
     * failover, which is the failure this is meant to catch.
     * @returns {boolean}
     */
    isReplicationMonitoringEnabled: () => process.env.REPLICATION_MONITORING_ENABLED !== 'false',
    /** @returns {number} Replay lag in seconds above which to alert */
    getReplicationLagAlertSeconds: () => parseInt(process.env.REPLICATION_LAG_ALERT_SECONDS, 10) || 300,
    /**
     * Age in seconds of the last successful WAL archive above which to alert.
     * Must stay comfortably above archive_timeout (300s) or it will alert on a
     * merely quiet database rather than a broken one.
     * @returns {number}
     */
    getWalArchiveStaleAlertSeconds: () => parseInt(process.env.WAL_ARCHIVE_STALE_ALERT_SECONDS, 10) || 900,
    getDiscordCriticalWebhook: () => process.env.DISCORD_CRITICAL_WEBHOOK,
    getEnv: (env) => process.env[env],
    getLinkupApiKey: () => process.env.LINKUP_API_KEY,
    getAnthropicApiKey: () => process.env.ANTHROPIC_API_KEY,
    getEnterpriseContactEmail: () => process.env.ENTERPRISE_CONTACT_EMAIL || 'antoine@tryethernal.com',
    getApolloApiKey: () => process.env.APOLLO_API_KEY,
    getProspectSenderEmail: () => process.env.PROSPECT_SENDER_EMAIL,
    getProspectReplyTo: () => process.env.PROSPECT_REPLY_TO,
    getProspectAdminUserIds: () => process.env.PROSPECT_ADMIN_USER_IDS
};
