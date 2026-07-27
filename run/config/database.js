const logger = require('../lib/logger');

/**
 * IP family used to resolve DB_HOST.
 *
 * Defaults to 4 to preserve existing behaviour. Set DB_FAMILY=6 when the
 * database is reached over an IPv6-only network (e.g. Fly.io private
 * networking, where *.internal names publish AAAA records only and an IPv4
 * lookup fails outright).
 *
 * Parsed to a Number on purpose: net.connect() ignores a string `family`,
 * which would silently fall back to IPv4.
 *
 * @returns {number} 4 or 6
 */
const getDbFamily = () => parseInt(process.env.DB_FAMILY, 10) || 4;

module.exports = {
    development: {
        "host": process.env.DB_HOST,
        "username": process.env.DB_USER,
        "database": "ethernal",
        "password": process.env.DB_PASSWORD,
        "port": process.env.DB_PORT,
        "dialect": "postgres",
        "dialectOptions": {
            "family": getDbFamily()
        },
        "logging": function(sql, sequelizeObject) {
            logger.debug(sql, { instance: sequelizeObject.instance });
        },
        benchmark: true,
        "pool": {
            max: 20,
            min: 2,
            acquire: 10000,
            idle: 30000,
            evict: 5000
        }
    },
    production: {
        "username": process.env.DB_USER,
        "password": process.env.DB_PASSWORD,
        "database": process.env.DB_NAME,
        "host": process.env.DB_HOST,
        "port": process.env.DB_PORT,
        "dialect": "postgres",
        "dialectOptions": {
            "family": getDbFamily(),
            "keepAlive": true,
            "keepAliveInitialDelayMillis": 10000
        },
        "hooks": {
            "afterConnect": function(connection) {
                return connection.query("SET idle_in_transaction_session_timeout = 30000; SET synchronous_commit = off;");
            }
        },
        "logging": function(sql, sequelizeObject) {
            logger.debug(sql, { instance: sequelizeObject.instance });
        },
        "pool": {
            max: 20,
            min: 2,
            acquire: 30000,
            idle: 10000,
            evict: 5000
        },
        "retry": {
            "match": [
                (err) => err.name && /ConnectionError/i.test(err.name),
                /connection terminated/i,
                /ECONNRESET/,
                /ETIMEDOUT/,
                /ECONNREFUSED/
            ],
            "max": 3
        }
    }
}
