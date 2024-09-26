import { DateTime } from 'luxon';

export default {
    shortDate(timestamp) {
        return DateTime
            .fromISO(timestamp)
            .toFormat('LL/dd h:mm:ss a');
    },

    fromNow(timestamp) {
        const relative= DateTime
            .fromISO(timestamp)
            .toRelative({ round: true });

        return relative.match(/seconds/) ? 'a few seconds ago' : relative;
    },
}
