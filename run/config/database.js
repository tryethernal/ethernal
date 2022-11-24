module.exports = {
    development: {
        "database": "ethernal_dev",
        "host": process.env.PGHOST,
        "username": process.env.PGUSER,
        "password": process.env.PGPASSWORD,
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
