module.exports = {
    development: {
        "host": process.env.REDIS_HOST,
        "port": process.env.REDIS_PORT,
    },
    production: {
        "host": process.env.REDIS_HOST,
        "port": process.env.REDIS_PORT,
        "username": process.env.REDIS_USERNAME,
        "password": process.env.REDIS_PASSWORD,
        "tls": process.env.ENABLE_REDIS_TLS,
        "enableTLSForSentinelMode": process.env.ENABLE_REDIS_TLS_SENTINEL
    }
}
