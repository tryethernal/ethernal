const functions = require('firebase-functions');
const admin = require('firebase-admin');
const models = require('../models');
const db = require('../lib/firebase')(models);

const User = models.User;
const sequelize = models.sequelize;

const processAllUsers = async (nextPageToken) => {
    const userList = await admin.auth().listUsers(1000, nextPageToken);
    for (let i = 0; i < userList.users.length; i++) {
        const authUser = userList.users[i];
        const fsUser = await db.getUser(authUser.uid);

        if (fsUser) {
            const transaction = await sequelize.transaction();
            try {
                let user;
                user = await User.findByAuthId(authUser.uid);
                if (user) {
                    console.log(`User ${authUser.uid} already exists`);
                }
                else {
                    user = await User.safeCreate(
                        authUser.uid,
                        authUser.email,
                        fsUser.apiKey,
                        fsUser.stripeCustomerId,
                        fsUser.plan || 'free',
                        fsUser.explorerSubscriptionId,
                        transaction
                    );
                }

                const fsWorkspaces = await db.getUserWorkspaces(authUser.uid);
                const docs = fsWorkspaces._docs();
                for (let j = 0; j < docs.length; j++) {
                    const fsWorkspace = docs[j].data();
                    const existingWorkspaces = await user.getWorkspaces({ where: { name: docs[j]._ref.id }});
                    if (existingWorkspaces.length > 0) {
                        console.log(`Workspace ${docs[j]._ref.id} already exists`);
                    }
                    else
                        await user.safeCreateWorkspace({ name: docs[j]._ref.id, ...fsWorkspace }, transaction);
                }

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