const logger = require('./lib//writeLog');
const app = require('./app');

const port = parseInt(process.env.PORT) || 6000;
app.listen(port, () => {
    logger.info(`Listening on port ${port}`);
});
