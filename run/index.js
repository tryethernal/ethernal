const logger = require('./lib/logger');
const app = require('./app');
const db = require('./models');

const port = parseInt(process.env.PORT) || 6000;
const server = app.listen(port, '::', () => {
    console.log(process.env.NODE_ENV == 'development' ? process.env : `App started on port ${port}`);
    logger.info(`Listening on port ${port}`);
});

function shutdown(signal) {
    logger.info(`${signal} received, draining connections...`);
    server.close(() => {
        db.sequelize.close().then(() => {
            logger.info('Database connections closed');
            process.exit(0);
        }).catch((err) => {
            logger.error('Error closing database connections', err);
            process.exit(1);
        });
    });
    setTimeout(() => process.exit(1), 4000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
