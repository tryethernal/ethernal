/**
 * @fileoverview Supported L1 networks for OP Stack L2 chains.
 * @module lib/opNetworks
 */

/**
 * Supported L1 parent chain networks for OP Stack.
 * Maps network ID to display configuration.
 *
 * @constant {Object.<number, {name: string, explorerUrl: string}>}
 */
const SUPPORTED_OP_L1_NETWORKS = {
    1: {
        name: 'Ethereum Mainnet',
        explorerUrl: 'https://etherscan.io'
    }
    // Future networks can be added here:
    // 11155111: { name: 'Sepolia Testnet', explorerUrl: 'https://sepolia.etherscan.io' }
};

/**
 * Get list of supported networks for OP Stack L1 parent selection.
 * @returns {Array<{networkId: number, name: string, explorerUrl: string}>}
 */
function getSupportedOpNetworks() {
    return Object.entries(SUPPORTED_OP_L1_NETWORKS).map(([networkId, config]) => ({
        networkId: parseInt(networkId),
        name: config.name,
        explorerUrl: config.explorerUrl
    }));
}

/**
 * Check if a network ID is supported as OP Stack L1 parent.
 * @param {number} networkId - The network ID to check
 * @returns {boolean}
 */
function isOpNetworkSupported(networkId) {
    return SUPPORTED_OP_L1_NETWORKS.hasOwnProperty(networkId);
}

/**
 * Get network configuration by network ID.
 * @param {number} networkId - The network ID
 * @returns {Object|null} Network config or null if not supported
 */
function getOpNetworkConfig(networkId) {
    return SUPPORTED_OP_L1_NETWORKS[networkId] || null;
}

module.exports = {
    SUPPORTED_OP_L1_NETWORKS,
    getSupportedOpNetworks,
    isOpNetworkSupported,
    getOpNetworkConfig
};
