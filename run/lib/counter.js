/**
 * @fileoverview Simple counter API integration using counterapi.dev.
 * Used for tracking usage metrics and statistics.
 * @module lib/counter
 */

const axios = require('axios');
const { getCounterNamespace } = require('./env');

module.exports = {
    /**
     * Increments a counter and returns the new value.
     * Uses counterapi.dev external service for persistent counting.
     * @param {string} key - The counter key to increment
     * @returns {Promise<number>} The incremented counter value
     */
    async countUp(key) {
        const response = await axios.get(`https://api.counterapi.dev/v1/${getCounterNamespace()}/${key}/up`);
        return response.data.count;
    },
};
