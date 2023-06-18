const Pusher = require('pusher');
const logger = require('./logger');

const isPusherPresent = process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET;

const pusher = isPusherPresent ?
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
        if (isPusherPresent) {
            pusher.trigger(channel, event, data)
                .catch(error => logger.error(error.message, { location: 'lib.pusher', error, channel, event, data }))
        }
    }
};
