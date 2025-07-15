const axios = require('axios');

let forbiddenChainsCache = null;
let forbiddenChainsCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchForbiddenChains() {
  // Use cache if not expired
  if (forbiddenChainsCache && Date.now() - forbiddenChainsCacheTime < CACHE_DURATION) {
    return forbiddenChainsCache;
  }
  const response = await axios.get('https://raw.githubusercontent.com/tryethernal/chainlist/refs/heads/main/constants/chainIds.js', {
    responseType: 'text',
    headers: { 'Cache-Control': 'no-cache' }
  });
  let jsonString = response.data
    .replace(/^export default\s*/, '') // Remove export default
    .replace(/;\s*$/, '') // Remove trailing semicolon
    .replace(/\/\/.*$/gm, '') // Remove single-line comments
    .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
    .trim();
  try {
    const forbiddenChains = JSON.parse(jsonString);
    forbiddenChainsCache = forbiddenChains;
    forbiddenChainsCacheTime = Date.now();
    return forbiddenChains;
  } catch (e) {
    console.error('Invalid JSON in chainIds.js:', jsonString);
    throw e;
  }
}

/**
 * Checks if a chain is allowed for demo explorer creation.
 * @param {string|number} networkId - The network ID to check.
 * @returns {Promise<boolean>} - True if allowed, false if forbidden.
 */
async function isChainAllowed(networkId) {
  const forbiddenChains = await fetchForbiddenChains();
  return !forbiddenChains[networkId];
}

module.exports = {
  isChainAllowed
};
