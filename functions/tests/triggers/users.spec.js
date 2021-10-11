const test = require('firebase-functions-test')();
const admin = require('firebase-admin');
const index = require('../../index');

jest.mock('stripe', () => {
    return () => {
        return {
            customers: {
                create: () => {
                    return new Promise((resolve) => resolve({ id: 'cus_123' }));
                }
            }
        }
    }
});
const stripe = require('stripe');

describe('generateKeyForNewUser', () => {
    let firestore;

    beforeEach(() => {
        firestore = admin.firestore();
    });

    it('Should generate and store an API key', async () => {
        await firestore.collection('users').doc('123').set({ currentWorkspace: '' });
        const data = test.firestore.makeDocumentSnapshot({}, 'users/123');

        const wrapped = test.wrap(index.generateKeyForNewUser);
        const result = await wrapped(data);

        const doc = await firestore.collection('users').doc('123').get();

        expect(doc.data()).toEqual({
            currentWorkspace: '',
            apiKey: expect.anything()
        });
        expect(result).toBe(true);
    });

    afterEach(async () => {
        test.cleanup();
        firestore.collection('users').doc('123').delete();
    })
});

describe('onCreateUser', () => {
    it('Should return true when passing a user with an email', async () => {
        const wrapped = test.wrap(index.onCreateUser);
        const result = await wrapped({ uid: '123', email: 'antoine@tryethernal.com '});

        expect(result).toBe(true);
    });
});