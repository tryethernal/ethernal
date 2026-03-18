const logger = require('../lib/logger');
module.exports = {
    development: {
        "host": process.env.DB_HOST,
        "username": process.env.DB_USER,
        "database": "ethernal",
        "password": process.env.DB_PASSWORD,
        "port": process.env.DB_PORT,
        "dialect": "postgres",
        "logging": function(sql, sequelizeObject) {
            logger.debug(sql, { instance: sequelizeObject.instance });
        },
        benchmark: true,
        "pool": {
            max: 20,
            min: 2,
            acquire: 10000,
            idle: 5000,
            evict: 1000
        }
    },
    production: {
        "username": process.env.DB_USER,
        "password": process.env.DB_PASSWORD,
        "database": process.env.DB_NAME,
        "host": process.env.DB_HOST,
        "port": process.env.DB_PORT,
        "dialect": "postgres",
        "logging": function(sql, sequelizeObject) {
            logger.debug(sql, { instance: sequelizeObject.instance });
        },
        "pool": {
            max: 400,
            min: 5,
            acquire: 10000,
            idle: 10000,
            evict: 1000
        }
    }
}
