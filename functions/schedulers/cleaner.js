const moment = require('moment');
const functions = require('firebase-functions');
let db;

const cleanArtifactDependencies = async (context) => {
    const users = await db.firestore.collection('users').get();
    const rtdbResetData = {}
    const userIds = users.docs
        .filter(doc => doc.data().plan != 'premium')
        .map((doc) => doc.id);

    for (let i = 0; i < userIds.length; i++) {
        console.log(`Checking user ${userIds[i]}`);
        await db.rtdb.ref(`users/${userIds[i]}`).once('value', async (snapshot) => {
            const data = snapshot.val();

            if (data && data.workspaces) {
                const workspaces = Object.keys(data.workspaces);
                for (let j = 0; j < workspaces.length; j++) {
                    const ws = data.workspaces[workspaces[j]];
                    const contracts = Object.keys(ws.contracts);
                    for (let k = 0; k < contracts.length; k++) {
                        const contract = ws.contracts[contracts[k]];
                        const contractRef = db.rtdb.ref(`users/${userIds[i]}/workspaces/${workspaces[j]}/contracts/${contracts[k]}`);
                        if (!contract.updatedAt)
                            await contractRef.update({ updatedAt: db.Timestamp.now()._seconds });
                        else {
                            const updatedAt = moment.unix(contract.updatedAt);
                            const cutOff = moment().subtract(7, 'days');

                            if (updatedAt.isBefore(cutOff)) {
                                console.log(`Cleaning ${contracts[k]}`);
                                await contractRef.set(null);
                            }
                        }
                    }
                }
            }
        })
    }

    return true;
};

module.exports = (loadedDb) => {
    db = db || loadedDb;

    return {
        cleanArtifactDependencies: cleanArtifactDependencies
    };
}
