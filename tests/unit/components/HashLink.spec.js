import MockHelper from '../MockHelper';

import HashLink from '@/components/HashLink.vue';

describe('HashLink.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display the token name if symbol but flag withTokenName', async (done) => {
        await helper.mocks.admin
            .collection('contracts')
            .doc('0x123')
            .set({ name: 'My Contract', token: { name: 'Ethernal', symbol: 'ETL', decimals: 18 }});

        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x123',
                withName: true,
                withTokenName: true
            }
        });

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);

    });

    it('Should display the token name if available & no token symbol', async (done) => {
        await helper.mocks.admin
            .collection('contracts')
            .doc('0x123')
            .set({ name: 'My Contract', token: { name: 'Ethernal', decimals: 18 }});

        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x123',
                withName: true
            }
        });

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);

    });

    it('Should display the token symbol if available', async (done) => {
        await helper.mocks.admin
            .collection('contracts')
            .doc('0x123')
            .set({ name: 'My Contract', token: { name: 'Ethernal', symbol: 'ETL', decimals: 18 }});

        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x123',
                withName: true
            }
        });

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    })

    it('Should display the contract name when no token', async (done) => {
        await helper.mocks.admin
            .collection('contracts')
            .doc('0x123')
            .set({ name: 'My Contract' });

        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x123',
                withName: true
            }
        });

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    it('Should display the name for the 0x0 address', (done)=> {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x0000000000000000000000000000000000000000',
                withName: true
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
                
        done();
    });

    it('Should not be copiable if the notCopiable flag is passed', (done)=> {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
                notCopiable: true
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
                
        done();
    });

    it('Should display a shortened link to the address', (done) => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
                fullHash: false
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
                
        done();
    });

    it('Should display a full link to the address', (done) => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
                fullHash: true
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
                
        done();
    });

    it('Should not display anything if no hash provided', (done) => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                fullHash: true
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
                
        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});
