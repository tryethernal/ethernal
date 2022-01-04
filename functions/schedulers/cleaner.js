const functions = require('firebase-functions');
const { rtdb, firestore } = require('../lib/firebase');

exports.cleanArtifactDependencies = async (context) => {
    const users = await firestore.collection('users').get();
    const rtdbResetData = {}
    users.docs
        .filter(doc => doc.data().plan != 'premium')
        .forEach((doc) => {
            rtdbResetData[doc.id] = null;
        });
    await rtdb.ref('users').update(rtdbResetData);
    return true;
};