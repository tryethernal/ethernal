const db = require('../lib/firebase');
const { getAuth } = require('firebase-admin/auth');
const { enqueue } = require('../lib/queue');

module.exports = async job => {
    const data = job.data;

    try {
        if (data.secret != process.env.SECRET)
            throw new Error('Missing parameter.');

        const listAllUsers = async nextPageToken => {
            const listUsersResult = await getAuth().listUsers(500, nextPageToken);
            listUsersResult.users.forEach(async userRecord => {
                await enqueue('insertFirebaseHashes', `insertFirebaseHashes-${Date.now()}`, { firebaseUser: userRecord, secret: data.secret });
            });

            if (listUsersResult.pageToken) {
                await listAllUsers(listUsersResult.pageToken);
            }
        };

        await listAllUsers();

        return true;
    } catch(error) {
        logger.error(error.message, { location: 'jobs.batchInsertFirebasePasswordHashes', error: error, data: data });
        return false
    }
};
