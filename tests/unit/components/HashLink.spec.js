import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import HashLink from '@/components/HashLink.vue';

describe('HashLink.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should not create links', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
             .mockResolvedValue({ data: { name: 'My Contract', tokenName: 'Ethernal' }});
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0xed5af388653567af2f388e6224dc7c4b3241c544',
                unlink: true,
                notCopiable: true,
                withName: true
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
                xsHash: true            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });


    it('Should display link to token if tokenId is passed', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
             .mockResolvedValue({ data: { name: 'My Contract', tokenName: 'Ethernal', tokenSymbol: 'ETL' }});

        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x123',
                tokenId: '1',
                withName: true,
                withTokenName: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the token name if symbol but flag withTokenName', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
             .mockResolvedValue({ data: { name: 'My Contract', tokenName: 'Ethernal', tokenSymbol: 'ETL' }});

        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x123',
                withName: true,
                withTokenName: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the token name if available & no token symbol', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
             .mockResolvedValue({ data: { name: 'My Contract', tokenName: 'Ethernal' }});

        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x123',
                withName: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the token symbol if available', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
             .mockResolvedValue({ data: { name: 'My Contract', tokenSymbol: 'ETL' }});

        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x123',
                withName: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    })

    it('Should display the contract name when no token', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
             .mockResolvedValue({ data: { name: 'My Contract' }});

        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x123',
                withName: true
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
        jest.spyOn(helper.mocks.server, 'getContract')
             .mockResolvedValue({});

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
        jest.spyOn(helper.mocks.server, 'getContract')
             .mockResolvedValue({});

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
        jest.spyOn(helper.mocks.server, 'getContract')
             .mockResolvedValue({});

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
