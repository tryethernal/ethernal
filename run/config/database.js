const path = require('path');

module.exports = {
    development: {
        "username": "antoine",
        "password": null,
        "database": "ethernal_dev",
        "host": "127.0.0.1",
        "dialect": "postgres",
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
        "username": process.env.DB_USERNAME,
        "database": process.env.DB_NAME,
        "password": process.env.DB_PASSWORD,
        "host": process.env.DB_HOST,
        "port": process.env.DB_PORT,
        "dialect": "postgres",
        // "pool": {
        //     "max": 80,
        //     "min": 0,
        //     "idle": 0,
        //     "acquire": 60000,
        //     "evict": 60000
        // }
    }
}
