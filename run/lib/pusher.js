const Pusher = require('pusher');
const writeLog = require('./writeLog');

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: 'eu',
    useTLS: true
});

module.exports = {
    trigger: function(channel, event, data) {
        return pusher.trigger(channel, event, data)
            .catch((error) => {
                writeLog({
                    functionName: 'pusher.trigger',
                    error: error,
                    extra: {}
                });
            });
    }
};
