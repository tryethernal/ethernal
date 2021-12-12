jest.mock('axios', () => ({
    get: jest.fn()
}));
const axios = require('axios');
const index = require('../../index');
const Helper = require('../helper');
let helper;

describe('processContract', () => {
    beforeEach(() => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
    });

    it('Should import and link proxy contract', async () => {
        await helper.workspace.collection('contracts').doc('0x125').set({
            address: '0x125',
            imported: true
        });
        const data = helper.test.firestore.makeDocumentSnapshot({
            address: '0x125',
        }, 'users/123/workspaces/hardhat/contracts/0x125');

        axios.get.mockImplementation(() => ({
            data: {
                message: 'OK',
                result: [{
                    ContractName: 'Contract',
                    Proxy: '1',
                    Implementation: '0xabcd',
                    ABI: JSON.stringify([{ my: 'function' }])
                }]
            }
        }));

        const result = await helper.test.wrap(index.processContract)(data, { params: { userId: '123', workspaceName: 'hardhat' }});

        const doc = await helper.workspace.collection('contracts').doc('0x125').get();
        expect(doc.data()).toEqual({
            address: '0x125',
            name: 'Contract',
            abi: [{ my: 'function' }],
            proxy: '0xabcd',
            imported: true
        });
    });

    it('Should match when contract is found locally', async () => {
        await helper.workspace.collection('contracts').doc('0x123').set({
            name: 'Contract',
            address: '0x123',
            hashedBytecode: '0x123abcd',
            abi: [{ my: 'function' }]
        });
        await helper.workspace.collection('contracts').doc('0x124').set({
            hashedBytecode: '0x123abcd',
            address: '0x124'
        });

        const data = helper.test.firestore.makeDocumentSnapshot({
            address: '0x124',
            hashedBytecode: '0x123abcd'
        }, 'users/123/workspaces/hardhat/contracts/0x124');

        const result = await helper.test.wrap(index.processContract)(data, { params: { userId: '123', workspaceName: 'hardhat' }});
        const doc = await helper.workspace.collection('contracts').doc('0x124').get();

        expect(doc.data()).toEqual({
            hashedBytecode: '0x123abcd',
            address: '0x124',
            name: 'Contract',
            abi: [{ my: 'function' }]
        });
    });

    it('Should match with etherscan if it is found', async () => {
        await helper.workspace.collection('contracts').doc('0x125').set({ address: '0x125', hashedBytecode: '0x123a' });
        const data = helper.test.firestore.makeDocumentSnapshot({
            address: '0x125',
            hashedBytecode: '0x123a'
        }, 'users/123/workspaces/hardhat/contracts/0x125');

        axios.get.mockImplementation(() => ({
            data: {
                message: 'OK',
                result: [{
                    ContractName: 'Contract',
                    ABI: JSON.stringify([{ my: 'function' }])
                }]
            }
        }));

        const result = await helper.test.wrap(index.processContract)(data, { params: { userId: '123', workspaceName: 'hardhat' }});

        const doc = await helper.workspace.collection('contracts').doc('0x125').get();
        expect(doc.data()).toEqual({
            address: '0x125',
            hashedBytecode: '0x123a',
            name: 'Contract',
            abi: [{ my: 'function' }]
        });
    });

    it('Should stay the same if it does not match anything', async () => {
        await helper.workspace.collection('contracts').doc('0x123').set({ address: '0x123', hashedBytecode: '0x123abcd' });
        const data = helper.test.firestore.makeDocumentSnapshot({
            address: '0x123',
            hashedBytecode: '0x123abcd'
        }, 'users/123/workspaces/hardhat/contracts/0x123');
        
        axios.get.mockImplementation(() => ({
            data: {
                message: 'NOTOK'
            }
        }));

        const result = await helper.test.wrap(index.processContract)(data, { params: { userId: '123', workspaceName: 'hardhat' }});
        const doc = await helper.workspace.collection('contracts').doc('0x123').get();
        expect(doc.data()).toEqual({
            address: '0x123',
            hashedBytecode: '0x123abcd'
        });
    });    

    it('Should not match if no hashedBytecode & ABI', async () => {
        await helper.workspace.collection('contracts').doc('0x123').set({ address: '0x123' });
        const data = helper.test.firestore.makeDocumentSnapshot({
            abi: { my: 'function' }
        }, 'users/123/workspaces/hardhat/contracts/0x123');

        const result = await helper.test.wrap(index.processContract)(data, { params: { userId: '123', workspaceName: 'hardhat' }});;

        const doc = await helper.workspace.collection('contracts').doc('0x123').get();
        expect(doc.data()).toEqual({ address: '0x123' });
    });

    it('Should not match if no abi & hashedBytecode', async () => {
        await helper.workspace.collection('contracts').doc('0x123').set({ address: '0x123', hashedBytecode: '0x123' });
        const data = helper.test.firestore.makeDocumentSnapshot({
            hashedBytecode: '0x123'
        }, 'users/123/workspaces/hardhat/contracts/0x123');

        axios.get.mockImplementation(() => ({
            data: {
                message: 'NOTOK'
            }
        }));

        const result = await helper.test.wrap(index.processContract)(data, { params: { userId: '123', workspaceName: 'hardhat' }});;

        const doc = await helper.workspace.collection('contracts').doc('0x123').get();
        expect(doc.data()).toEqual({ address: '0x123', hashedBytecode: '0x123' });
    });

    afterEach(() => helper.clean());
});