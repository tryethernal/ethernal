const models = require('../models');
const User = models.User;
const { enqueue } = require('../lib/queue');
const logger = require('../lib/logger');

module.exports = async job => {
    const data = job.data;
    try {
        if (data.secret != process.env.SECRET || !data.firebaseUser)
            throw new Error('Missing parameter.');

        const user = await User.findOne({ where: { firebaseUserId: data.firebaseUser.uid }});
        if (user)
            await user.update({
                passwordHash: data.firebaseUser.passwordHash,
                passwordSalt: data.firebaseUser.passwordSalt
            });

        return true;
    } catch(error) {
        logger.error(error.message, { location: 'jobs.batchInsertFirebasePasswordHashes', error: error, data: data });
        return false;
    }
};
