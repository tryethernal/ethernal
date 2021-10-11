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
                timestamp: 1633778007,
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

    it('Should show the loading message when empty contracts list', async (done) => {
        const wrapper = helper.mountFn(Contracts);
        await wrapper.vm.$nextTick();

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    it('Should display a warning message for free users with 10 contracts', async (done) => {
        for (let i = 0; i < 10; i++)
            await db.collection('contracts')
                .doc(`Ox${i}`)
                .set({ address: `0x${i}`, name: `0x${i}`, timestamp: 1633778007 + i });

        const wrapper = helper.mountFn(Contracts);
        await wrapper.vm.$nextTick();

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    it('Should not display a warning message for premium users with 10 contracts', async (done) => {
        helper.getters.user.mockImplementation(() => { return { plan: 'premium', trialEndsAt: Date.now() - 24 * 3600 } });
        for (let i = 0; i < 10; i++)
            await db.collection('contracts')
                .doc(`Ox${i}`)
                .set({ address: `0x${i}`, name: `0x${i}`, timestamp: 1633778007 + i });

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
