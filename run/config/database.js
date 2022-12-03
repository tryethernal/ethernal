module.exports = {
    development: {
        "database": "ethernal_dev",
        "host": process.env.DB_HOST,
        "username": process.env.DB_USER,
        "database": 'ethernal',
        "password": process.env.DB_PASSWORD,
        "dialect": "postgres"
    },
    production: {
        "username": process.env.DB_USERNAME,
        "password": process.env.DB_PASSWORD,
        "database": process.env.DB_NAME,
        "host": process.env.DB_HOST,
        "port": process.env.DB_PORT,
        "dialect": "postgres"
    }
}
