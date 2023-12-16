const logger = require('../lib/logger');
module.exports = {
    development: {
        "host": process.env.DB_HOST,
        "username": process.env.DB_USER,
        "database": "ethernal",
        "password": process.env.DB_PASSWORD,
        "dialect": "postgres",
        "logging": function(sql, sequelizeObject) {
            logger.debug(sql, { instance: sequelizeObject.instance });
        }
    },
    production: {
        "username": process.env.DB_USERNAME,
        "password": process.env.DB_PASSWORD,
        "database": process.env.DB_NAME,
        "host": process.env.DB_HOST,
        "port": process.env.DB_PORT,
        "dialect": "postgres",
        "logging": function(sql, sequelizeObject) {
            logger.debug(sql, { instance: sequelizeObject.instance });
        }
    }
}
