const { getRedisHost, getRedisPort, getRedisUsername, getRedisPassword, getRedisTls, getRedisTlsSentinel } = require('../lib/env');

module.exports = {
    development: {
        'host': getRedisHost(),
        'port': getRedisPort(),
    },
    production: {
        'host': getRedisHost(),
        'port': getRedisPort(),
        'username': getRedisUsername(),
        'password': getRedisPassword(),
        'tls': getRedisTls(),
        'enableTLSForSentinelMode': getRedisTlsSentinel()
    }
}
