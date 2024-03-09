const Pusher = require('pusher');
const logger = require('./logger');
const { isPusherEnabled, isProductionEnvironment } = require('./flags');
const { getSoketiDefaultAppId, getSoketiDefaultAppKey, getSoketiDefaultAppSecret, getSoketiHost, getSoketiPort, getSoketiUseTLS } = require('./env');

const pusher = isPusherEnabled() ?
    new Pusher({
        appId: getSoketiDefaultAppId(),
        key: getSoketiDefaultAppKey(),
        secret: getSoketiDefaultAppSecret(),
        host: getSoketiHost(),
        port: getSoketiPort(),
        scheme: 'http',
        useTLS: getSoketiUseTLS()
    }) :
    { trigger: () => new Promise(resolve => resolve()) };

module.exports = {
    pusher,
    trigger: (channel, event, data) => {
        if (isPusherEnabled()) {
            pusher.trigger(channel, event, data)
                .catch(error => {
                    if (isProductionEnvironment())
                        logger.error(error.message, { location: 'lib.pusher', error, channel, event, data });
                });
        }
    }
};
