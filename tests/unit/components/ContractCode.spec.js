import flushPromises from 'flush-promises';

vi.mock('highlight.js', () => ({
    default: {
        highlight: vi.fn().mockReturnValue({ value: 'highlighted code' })
    }
}));

import ContractCode from '@/components/ContractCode.vue';

const stubs = [
    'Contract-Verification',
    'Contract-Verification-Info',
    'Expandable-Text'
];

describe('ContractCode.vue', () => {
    it('Should show loading state initially', async () => {
        const wrapper = mount(ContractCode, {
            props: {
                contract: {
                    bytecode: '0x60',
                    asm: 'abc'
                }
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display contract verification info if public explorer and verified', async () => {
        const wrapper = mount(ContractCode, {
            props: {
                contract: {
                    bytecode: '0x60',
                    asm: 'abc',
                    abi: require('../fixtures/NFTCollectibleABI.json'),
                    verificationStatus: 'success',
                    verification: {
                        constructorArguments: '0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000046162636400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000005000000000000000000000000000000000000000000000000000000000000000461626364000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001610000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016200000000000000000000000000000000000000000000000000000000000000',
                        libraries: {
                            Library: '0x12345'
                        }
                    }
                }
            },
            global: {
                stubs,
                plugins: [createTestingPinia({ initialState: { explorer: { id: 1 } } })]
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the contract verification panel for public explorers', async () => {
        const wrapper = mount(ContractCode, {
            props: {
                contract: {
                    bytecode: '0x60',
                    asm: 'abc'
                }
            },
            global: {
                stubs,
                plugins: [createTestingPinia({ initialState: { explorer: { id: 1 } } })]
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not display the contract verification panel if not public explorer', async () => {
        const wrapper = mount(ContractCode, {
            props: {
                contract: {
                    name: 'Contract',
                    patterns: [],
                    address: '0x123',
                    creationTransaction: '0xabc'
                }
            },
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show success alert when contract is just verified', async () => {
        const wrapper = mount(ContractCode, {
            props: {
                contract: {
                    bytecode: '0x60',
                    asm: 'abc'
                }
            },
            global: {
                stubs,
                plugins: [createTestingPinia({ initialState: { explorer: { id: 1 } } })]
            }
        });

        await wrapper.vm.onContractVerified({ someData: 'test' });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show appropriate message when no bytecode is present', async () => {
        const wrapper = mount(ContractCode, {
            props: {
                contract: {
                    asm: 'abc'
                }
            },
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show appropriate message when no assembly is present', async () => {
        const wrapper = mount(ContractCode, {
            props: {
                contract: {
                    bytecode: '0x60'
                }
            },
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
