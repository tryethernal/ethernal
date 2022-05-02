const path = require('path');
const functions = require('firebase-functions');
const config = functions.config();

module.exports = {
    development: {
        "username": "antoine",
        "password": null,
        "database": "ethernal_dev",
        "host": "127.0.0.1",
        "dialect": "postgres",
        // "username": config.db.username,
        // "password": config.db.password,
        // "database": config.db.database,
        // "host": config.db.host,
        // "port": config.db.port,
        "dialect": "postgres",
        "pool": {
            "max": 1000,
            "min": 0,
            "idle": 0,
            "acquire": 3000,
            "evict": 60000
        }
    },
    production: {
        "username": config.db.username,
        "password": config.db.password,
        "database": config.db.database,
        "host": config.db.host,
        "port": config.db.port,
        "dialect": "postgres",
        "pool": {
            "max": 1,
            "min": 0,
            "idle": 0,
            "acquire": 3000,
            "evict": 60000
        }
    }
}
