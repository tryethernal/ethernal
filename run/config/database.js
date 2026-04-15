const logger = require('../lib/logger');
module.exports = {
    development: {
        "host": process.env.DB_HOST,
        "username": process.env.DB_USER,
        "database": "ethernal",
        "password": process.env.DB_PASSWORD,
        "port": process.env.DB_PORT,
        "dialect": "postgres",
        "dialectOptions": {
            "family": 4
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
            "family": 4,
            "keepAlive": true,
            "keepAliveInitialDelayMillis": 10000
        },
        "hooks": {
            "afterConnect": function(connection) {
                return connection.query("SET statement_timeout = 60000; SET idle_in_transaction_session_timeout = 30000;");
            }
        },
        "logging": function(sql, sequelizeObject) {
            logger.debug(sql, { instance: sequelizeObject.instance });
        },
        "pool": {
            max: 15,
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
