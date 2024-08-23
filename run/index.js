const logger = require('./lib/logger');
const app = require('./app');

const port = parseInt(process.env.PORT) || 6000;
app.listen(port, '::', () => {
    console.log(process.env.NODE_ENV == 'development' ? process.env : `App started on port ${port}`);
    logger.info(`Listening on port ${port}`);
});
