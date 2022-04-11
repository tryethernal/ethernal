const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { sequelize, User } = require('../models');
const { getUser, getUserWorkspaces } = require('../lib/firebase');

const processAllUsers = async (nextPageToken) => {
    const userList = await admin.auth().listUsers(1000, nextPageToken);
    for (let i = 0; i < userList.users.length; i++) {
        const authUser = userList.users[i];
        const fsUser = (await getUser(authUser.uid)).data();

        if (fsUser) {
            const transaction = await sequelize.transaction();
            try {
                const user = await User.safeCreate(
                    authUser.uid,
                    authUser.email,
                    fsUser.apiKey,
                    fsUser.stripeCustomerId,
                    fsUser.plan || 'free',
                    fsUser.explorerSubscriptionId,
                    transaction
                );

                const fsWorkspaces = await getUserWorkspaces(authUser.uid);
                const docs = fsWorkspaces._docs();
                for (let j = 0; j < docs.length; j++) {
                    const fsWorkspace = docs[j].data();
                    await user.safeCreateWorkspace({ name: docs[j]._ref.id, ...fsWorkspace }, transaction);
                };

                await transaction.commit();
            } catch(tError) {
                console.log('tError');
                console.log(tError);
                await transaction.rollback();
            }
        }
        else
            console.log(`Couldn't find uid ${authUser.uid} in Firestore`);
    };
    if (userList.nextPageToken)
        await processAllUsers(userList.nextPageToken);
};

module.exports = async (data, context) => {
    try {
        await processAllUsers();
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
};