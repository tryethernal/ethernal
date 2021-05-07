const functions = require('firebase-functions');
const uuidAPIKey = require('uuid-apikey');

const { storeApiKey } = require('../lib/firebase');
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
