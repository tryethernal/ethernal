const Pusher = require('pusher');
const logger = require('./logger');
const { isPusherEnabled } = require('./flags');


const pusher = isPusherEnabled() ?
    new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: 'eu',
        useTLS: true
    }) :
    { trigger: () => new Promise(resolve => resolve()) };

module.exports = {
    trigger: (channel, event, data) => {
        if (isPusherEnabled()) {
            pusher.trigger(channel, event, data)
                .catch(error => logger.error(error.message, { location: 'lib.pusher', error, channel, event, data }))
        }
    }
};
