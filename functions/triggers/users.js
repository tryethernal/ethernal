const functions = require('firebase-functions');
const uuidAPIKey = require('uuid-apikey');

const { storeApiKey, getAllUsers } = require('../lib/firebase');
const { encrypt } = require('../lib/crypto');

const _generateAndStoreApiKey = (user) => {
    const apiKey = uuidAPIKey.create().apiKey;
    const encryptedKey = encrypt(apiKey);
    storeApiKey(user.id, encryptedKey);
};

exports.generateKeyForNewUser = (snap, context) => {
    try {
        const user = snap.data();
        _generateAndStoreApiKey({id: snap.id, ...user});

        return true;
    } catch (error) {
        console.log(error);
    }
};

exports.generateKeys = functions.https.onCall(async (data, context) => {
    try {
        const users = await getAllUsers();

        if (!users.empty) {
            users.forEach((user) => {
                if (!user.data().apiKey) {
                    _generateAndStoreApiKey(user);
                }
            });
        }
        return { sucess: true };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError('unknown', reason);
    }
});
