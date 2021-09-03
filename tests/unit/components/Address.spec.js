import MockHelper from '../MockHelper';

import Address from '@/components/Address.vue';
import AmalfiContract from '../fixtures/AmalfiContract.json';

describe('Address.vue', () => {
    let helper, $route;

    beforeEach(async () => {
        helper = new MockHelper({}, $route);
    });

    it('Should sync the balance when loaded', async (done) => {
        const db = helper.mocks.db;
        const wrapper = helper.mountFn(Address, {
            propsData: {
                hash: '123'
            }
        });
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.balance).toBe('10000');
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should show the transactions for this address', async (done) => {
        const db = helper.mocks.db;
        const transaction1 = {
            hash: '0x060034486a819816df57d01eefccbe161d7019f9f3c235e18af07468fb194ef0',
            timestamp: '1621548462',
            from: '0x1',
            to: '123',
            blockNumber: 1,
            value: '0'
        };

        const transaction2 = {
            hash: '0x0abc16784486a819816df57d01eefccbe161d7019f9f3c235e18af07468fb194ef1',
            timestamp: '1621548462',
            from: '0x2',
            to: '123',
            blockNumber: 1,
            value: '0'
        };        

        await db.collection('transactions')
            .doc(transaction1.hash)
            .set(transaction1);

        await db.collection('transactions')
            .doc(transaction2.hash)
            .set(transaction2);

        const wrapper = helper.mountFn(Address, {
            propsData: {
                hash: '123'
            }
        });
        
        setTimeout(() => {
            expect(wrapper.vm.transactionsTo.length).toBe(2);
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1000);
    });

    it('Should display extra tabs for contracts addresses', async (done) => {
        const db = helper.mocks.db;
        await db.collection('contracts').doc('123').set({ address: '123' });

        const wrapper = helper.mountFn(Address, {
            propsData: {
                hash: '123'
            }
        });
        
        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1000);
    });

    it('Should display the contract interaction interface under the contract tab if there is an ABI', async (done) => {
        const db = helper.mocks.db;
        await db.collection('contracts').doc('123').set({ name: 'Amalfi', address: '123', abi: AmalfiContract.artifact.abi });
        
        const wrapper = helper.mountFn(Address, {
            propsData: {
                hash: '123'
            }
        });

        setTimeout(async () => {
            await wrapper.find('#contractTab').trigger('click');
            await wrapper.vm.$nextTick();

            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    it('Should display the contract storage structure', async (done) => {
        const db = helper.mocks.db;
        await db.collection('contracts').doc('123').set({ name: 'Amalfi', address: '123', abi: AmalfiContract.artifact.abi });

        await db.contractStorage('123/artifact').set(AmalfiContract.artifact);
        for (const dependency in AmalfiContract.dependencies)
            await db.contractStorage(`123/dependencies/${dependency}`).set(AmalfiContract.dependencies[dependency]);

        const transaction = {
            hash: '0x060034486a819816df57d01eefccbe161d7019f9f3c235e18af07468fb194ef0',
            timestamp: '1621548462',
            from: '0x1',
            to: '123',
            blockNumber: 1,
            gasPrice: 1,
            value: '0',
            receipt: {
                logs: [],
                gasUsed: 10
            },
            functionSignature: 'transfer(address dst, uint256 rawamount)',
            data: '0xba118f63000000000000000000000000eb4220df353ecf892314f341d36868924221dc6f0000000000000000000000000000000000000000000000000000000576223549'
        };

        await db.collection('transactions')
            .doc(transaction.hash)
            .set(transaction);

        const wrapper = helper.mountFn(Address, {
            propsData: {
                hash: '123'
            }
        });

        setTimeout(async () => {
            await wrapper.find('#storageTab').trigger('click');
            await wrapper.vm.$nextTick();
            await wrapper.find('div[role="listitem"][tabindex="0"]').trigger('click');
            await wrapper.vm.$nextTick();
            done();
        }, 1500);
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});
