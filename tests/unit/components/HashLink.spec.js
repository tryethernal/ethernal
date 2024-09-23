import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import HashLink from '@/components/HashLink.vue';

describe('HashLink.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display an external link if embedded', async () => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0xed5af388653567af2f388e6224dc7c4b3241c544'
            },
            getters: {
                embedded: jest.fn(() => true),
                publicExplorer: jest.fn(() => ({ domain: 'explorer.tryethernal.com' }))
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display faucet name', async () => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0xed5af388653567af2f388e6224dc7c4b3241c544',
                withName: true
            },
            getters: {
                publicExplorer: jest.fn(() => ({ token: 'ETL', faucet: { address: '0xed5af388653567af2f388e6224dc7c4b3241c544' }}))
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display custom label', async () => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0xed5af388653567af2f388e6224dc7c4b3241c544',
                customLabel: 'My Address'
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not create links', async () => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0xed5af388653567af2f388e6224dc7c4b3241c544',
                unlink: true,
                notCopiable: true,
                withName: true,
                contract: { name: 'My Contract', tokenName: 'Ethernal' }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display smaller hash if xsHash option is passed', async () => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0xed5af388653567af2f388e6224dc7c4b3241c544',
                xsHash: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });


    it('Should display link to token if tokenId is passed', async () => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x123',
                tokenId: '1',
                withName: true,
                withTokenName: true,
                contract: { name: 'My Contract', tokenName: 'Ethernal', tokenSymbol: 'ETL' }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the token name if symbol but flag withTokenName', async () => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x123',
                withName: true,
                withTokenName: true,
                contract: { name: 'My Contract', tokenName: 'Ethernal', tokenSymbol: 'ETL' }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the token name if available & no token symbol', async () => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x123',
                withName: true,
                contract: { name: 'My Contract', tokenName: 'Ethernal' }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the token symbol if available', async () => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x123',
                withName: true,
                contract: { name: 'My Contract', tokenSymbol: 'ETL' }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    })

    it('Should display the contract name when no token', async () => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x123',
                withName: true,
                contract: { name: 'My Contract' }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the name for the 0x0 address', () => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x0000000000000000000000000000000000000000',
                withName: true
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not be copiable if the notCopiable flag is passed', async () => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
                notCopiable: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display a shortened link to the address', async () => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
                fullHash: false
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display a full link to the address', async () => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
                fullHash: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not display anything if no hash provided', () => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                fullHash: true
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});
