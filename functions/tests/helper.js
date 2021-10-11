const firebaseTools = require('firebase-tools');
const firebaseFunctionsTest = require('firebase-functions-test');
const admin = require('firebase-admin');
const functions = require('firebase-functions');

class Helper {

    constructor(projectId) {
        this.projectId = projectId;

        this.test = firebaseFunctionsTest({
            projectId: this.projectId,
            databaseURL: `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}/?ns=${this.projectId}`
        });
        this.test.mockConfig({
            encryption: {
                key: '382A5C31A96D38E3DF430E5101E8D07D',
                jwt_secret: '26F95488BA7D7E545B1B8669990739BB21A0A6D3EFB4910C0460B068BDDD3E1C',
            },
            fb: { token: '1234567890' },
            etherscan: { token: '1234' },
            stripe: {
                webhook_secret: 'whsec_test_secret'
            },
            ethernal: {
                root_url: 'http://localhost:8545',
                plans: {
                    premium: 'price_1JiLucJG8RHJCKOzPf0PPfS2'
                }
            }
        });
    }

    async setUser(data = {}) {
        const userData = {
            ...data,
            plan: data.plan || 'free'
        };

        await this.firestore
            .collection('users')
            .doc('123')
            .set(userData, { merge: true })
    }

    get firestore() {
        return admin.firestore();
    }

    get database() {
        return admin.database();
    } 

    get workspace() {
        return this.firestore.collection('users').doc('123').collection('workspaces').doc('hardhat');
    }

    async clean() {
        this.test.cleanup();
        await firebaseTools.firestore.delete('users/123', {
            project: process.env.GCLOUD_PROJECT,
            recursive: true,
            yes: true,
            token: functions.config().fb.token
        });
        await this.database.ref('/users/123/workspaces/hardhat').set(null);
    }
}

module.exports = Helper;
