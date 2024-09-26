const { getRedisUrl } = require('./env');
const Redis = require('ioredis');

module.exports = new Redis(getRedisUrl(), {
    maxRetriesPerRequest: null
});