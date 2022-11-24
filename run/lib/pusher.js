const Pusher = require('pusher');
const writeLog = require('./writeLog');

const isPusherPresent = process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET;

const pusher = isPusherPresent ?
    new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: 'eu',
        useTLS: true
    }) :
    {}

module.exports = {
    trigger: (channel, event, data) => {
        if (isPusherPresent)
            return pusher.trigger(channel, event, data)
                .catch(error => writeLog({ functionName: 'pusher.trigger', error: error, extra: { channel, event, data }}));
    }
};
