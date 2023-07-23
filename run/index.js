if (process.env.NEW_RELIC_APP_NAME)
    require('newrelic');
const logger = require('./lib/logger');
const app = require('./app');

const port = parseInt(process.env.PORT) || 6000;
app.listen(port, () => {
    console.log('App started.');
    logger.info(`Listening on port ${port}`);
});
