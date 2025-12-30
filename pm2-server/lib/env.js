/**
 * @fileoverview Environment variable helpers.
 * Provides getters for Ethernal API host, secret, and local secret.
 * @module pm2-server/lib/env
 */

module.exports = {
    getEthernalSecret: () => process.env.ETHERNAL_SECRET,
    getApiHost: () => process.env.ETHERNAL_HOST || 'http://localhost:8888',
    getSecret: () => process.env.SECRET
};
