import MockHelper from '../MockHelper';

import Contracts from '@/components/Contracts.vue';

describe('Contracts.vue', () => {
    let helper, db;

    beforeEach(async () => {
        helper = new MockHelper();
        db = helper.mocks.db;
    });

    it('Should show the contracts list', async (done) => {
        const contracts = [
            {
                address: '0x0',
                name: 'My Contract',
            },
            {
                address: '0x1',
                name: 'Another Contract',
            }
        ];

        for (const contract of contracts)
            await db.collection('contracts')
                .doc(contract.address)
                .set(contract);

        const wrapper = helper.mountFn(Contracts);
        await wrapper.vm.$nextTick();

        setTimeout(() => {
            expect(wrapper.vm.contracts).toStrictEqual(contracts);
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    it('should show the loading message when empty contracts list', async (done) => {
        const wrapper = helper.mountFn(Contracts);
        await wrapper.vm.$nextTick();

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    afterEach(async (done) => {
        await helper.clearFirebase();
        done();
    });
});
