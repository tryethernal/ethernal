module.exports = {
    development: {
        "host": "http://12.0.0.01",
        "port": 6379,
    },
    production: {
        "host": process.env.REDIS_HOST,
        "port": process.env.REDIS_PORT,
    }
}
