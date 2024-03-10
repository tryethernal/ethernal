const Pusher = require('pusher');
const logger = require('./logger');
const { isPusherEnabled } = require('./flags');
const { getSoketiDefaultAppId, getSoketiDefaultAppKey, getSoketiDefaultAppSecret, getSoketiHost, getSoketiPort, getSoketiScheme, getSoketiUseTLS } = require('./env');

const pusher = isPusherEnabled() ?
    new Pusher({
        appId: getSoketiDefaultAppId(),
        key: getSoketiDefaultAppKey(),
        secret: getSoketiDefaultAppSecret(),
        host: getSoketiHost(),
        port: getSoketiPort(),
        scheme: getSoketiScheme(),
        useTLS: getSoketiUseTLS()
    }) :
    { trigger: () => new Promise(resolve => resolve()) };

module.exports = {
    pusher,
    trigger: (channel, event, data) => {
        if (isPusherEnabled()) {
            pusher.trigger(channel, event, data)
                .catch(error => {
                    logger.error(error.message, { location: 'lib.pusher', error, channel, event, data });
                });
        }
    }
};
