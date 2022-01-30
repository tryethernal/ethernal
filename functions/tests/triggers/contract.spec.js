jest.mock('axios', () => ({
    get: jest.fn()
}));
const axios = require('axios');
const index = require('../../index');
const Helper = require('../helper');
const AmalfiContract = require('../fixtures/AmalfiContract.json');
const Transaction = {"blockHash":"0x50b10286540941286570588a16a59cc73fac0f2d8213ad49e6614d1985fd6d82","data":"0xba118f6300000000000000000000000063606c22157476da3b26ad1c2eae573d0387d7330000000000000000000000000000000000000000000000000000000065a55d7d","accessList":[],"transactionIndex":0,"confirmations":1,"type":2,"nonce":2,"gasLimit":"6721975","r":"0x22ab3ac486de70bfe6735bae92a38e18a37bbfbe09a5facc1c8bb48967a802ee","s":"0x6ad0bebea8f80ff739a6cf9f75c057292ee2e29ded602734e5d496bd063797e3","chainId":31337,"v":1,"blockNumber":14008967,"from":"0x2d481eeb2ba97955cd081cf218f453a817259ab1","receipt":{"blockHash":"0x50b10286540941286570588a16a59cc73fac0f2d8213ad49e6614d1985fd6d82","logsBloom":"0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","transactionIndex":0,"confirmations":1,"transactionHash":"0xaa82e74b71fb20503205beaffb60a38b08c6766a66dae1477b479df0e05f1bbe","gasUsed":"46419","blockNumber":14008967,"cumulativeGasUsed":"46419","from":"0x2d481eeb2ba97955cd081cf218f453a817259ab1","to":"0x63606c22157476da3b26ad1c2eae573d0387d733","logs":[],"byzantium":true,"status":1},"to":"0x63606c22157476da3b26ad1c2eae573d0387d733","value":"0","hash":"0xaa82e74b71fb20503205beaffb60a38b08c6766a66dae1477b479df0e05f1bbe","gasPrice":"76869329841","timestamp":1642264024,"methodDetails":{"signature":"setMaturity(address payee, uint256 maturity)","name":"setMaturity","label":"setMaturity(\n\taddress payee: 0x63606C22157476Da3B26Ad1c2EAE573D0387D733,\n\tuint256 maturity: 1705336189\n)"}};
let helper;

describe('processContract', () => {
    beforeEach(() => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
    });

    it('Should process associated existing transactions', async () => {
        await helper.workspace
            .collection('transactions')
            .doc(Transaction.hash)
            .set(Transaction);

        const data = helper.test.firestore.makeDocumentSnapshot({
            address: Transaction.to,
            abi: AmalfiContract.artifact.abi,
        }, `users/123/workspaces/hardhat/contracts/${Transaction.to}`);

        await helper.test.wrap(index.processContract)(data, { params: { userId: '123', workspaceName: 'hardhat' }});

        const transactionDoc = await helper.workspace
            .collection('transactions')
            .doc(Transaction.hash)
            .get();

        expect(transactionDoc.data()).toMatchSnapshot();
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
        expect(doc.data()).toEqual({ address: '0x123', abi: { my: 'function' } });
    });

    it('Should not match if no abi & hashedBytecode & no etherscan match', async () => {
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