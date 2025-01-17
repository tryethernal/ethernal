import { DateTime } from 'luxon';

export default {
    shortDate(timestamp) {
        if (!timestamp) return '';
        return DateTime
            .fromISO(timestamp)
            .toFormat('LL/dd h:mm:ss a');
    },

    fromNow(timestamp) {
        if (!timestamp) return '';

        const relative = DateTime
            .fromISO(timestamp)
            .toRelative({ round: true });

        return relative.match(/seconds/) ? 'a few seconds ago' : relative;
    },

    format(timestamp, format) {
        if (!timestamp) return '';
        return DateTime
            .fromISO(timestamp)
            .toFormat(format);
    }
}
