import flushPromises from 'flush-promises';

import { useCustomisationStore } from '@/stores/customisation.js';
import HashLink from '@/components/HashLink.vue';

const getPiniaInstance = ({ initialState, mockUpdateCustomisations = null, mockAlternateLink = null }) => {
    const pinia = createTestingPinia({ initialState });
    const customisationsStore = useCustomisationStore(pinia);
    vi.mocked(customisationsStore.updateCustomisations).mockResolvedValueOnce(mockUpdateCustomisations);
    vi.mocked(customisationsStore.alternateLink).mockResolvedValueOnce(mockAlternateLink);
    return pinia;
}

describe('HashLink.vue', () => {
    it.only('Should display an external link if embedded', async () => {
        const pinia = getPiniaInstance(
            {
                explorer: { domain: 'explorer.tryethernal.com' },
            },
            null,
            null
        );

        const wrapper = mount(HashLink, {
            props: {
                type: 'address',
                hash: '0xed5af388653567af2f388e6224dc7c4b3241c544'
            },
            global: {
                plugins: [pinia],
                provide: {
                    isEmbedded: true
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display faucet name', async () => {
        const wrapper = mount(HashLink, {
            props: {
                type: 'address',
                hash: '0xed5af388653567af2f388e6224dc7c4b3241c544',
                withName: true
            },
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        explorer: {
                            token: 'ETL',
                            faucet: { address: '0xed5af388653567af2f388e6224dc7c4b3241c544' }
                        },
                        customisation: {}
                    }
                })]
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display custom label', async () => {
        const wrapper = mount(HashLink, {
            props: {
                type: 'address',
                hash: '0xed5af388653567af2f388e6224dc7c4b3241c544',
                customLabel: 'My Address'
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not create links', async () => {
        const wrapper = mount(HashLink, {
            props: {
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
        const wrapper = mount(HashLink, {
            props: {
                type: 'address',
                hash: '0xed5af388653567af2f388e6224dc7c4b3241c544',
                xsHash: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });


    it('Should display link to token if tokenId is passed', async () => {
        const wrapper = mount(HashLink, {
            props: {
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
        const wrapper = mount(HashLink, {
            props: {
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
        const wrapper = mount(HashLink, {
            props: {
                type: 'address',
                hash: '0x123',
                contract: { name: 'My Contract', tokenName: 'Ethernal' }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the token symbol if available', async () => {
        const wrapper = mount(HashLink, {
            props: {
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
        const wrapper = mount(HashLink, {
            props: {
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
        const wrapper = mount(HashLink, {
            props: {
                type: 'address',
                hash: '0x0000000000000000000000000000000000000000',
                withName: true
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not be copiable if the notCopiable flag is passed', async () => {
        const wrapper = mount(HashLink, {
            props: {
                type: 'address',
                hash: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
                notCopiable: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display a shortened link to the address', async () => {
        const wrapper = mount(HashLink, {
            props: {
                type: 'address',
                hash: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
                fullHash: false
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display a full link to the address', async () => {
        const wrapper = mount(HashLink, {
            props: {
                type: 'address',
                hash: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
                fullHash: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not display anything if no hash provided', () => {
        const wrapper = mount(HashLink, {
            props: {
                type: 'address',
                fullHash: true
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});
