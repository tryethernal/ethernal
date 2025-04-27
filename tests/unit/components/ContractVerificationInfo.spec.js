import flushPromises from 'flush-promises';

vi.mock('@metamask/detect-provider');
import ContractVerificationInfo from '@/components/ContractVerificationInfo.vue';

const stubs = [
    'Formatted-Sol-Var',
    'Contract-Code-Editor'
];

describe('ContractVerificationInfo.vue', () => {
    it('Should display code / constructor arguments / libraries', async () => {
        const wrapper = mount(ContractVerificationInfo, {
            props: {
                contract: {
                    bytecode: '0x60',
                    asm: 'abc',
                    abi: require('../fixtures/NFTCollectibleABI.json'),
                    verificationStatus: 'success',
                    verification: {
                        contractName: 'My Contract',
                        evmVersion: 'london',
                        compilerVersion: 'compiler',
                        runs: 200,
                        constructorArguments: '0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000046162636400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000005000000000000000000000000000000000000000000000000000000000000000461626364000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001610000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016200000000000000000000000000000000000000000000000000000000000000',
                        libraries: {
                            Library: '0x12345'
                        },
                        sources: [{ fileName: 'File.sol', content: 'i am solidity code' }]
                    }
                }
            },
            global: {
                plugins: [createTestingPinia({ initialState: { explorer: { id: 1, slug: 'ethernal' } } })],
                stubs: stubs,
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display without constructor arguments', async () => {
        const wrapper = mount(ContractVerificationInfo, {
            props: {
                contract: {
                    bytecode: '0x60',
                    asm: 'abc',
                    abi: require('../fixtures/NFTCollectibleABI.json'),
                    verificationStatus: 'success',
                    verification: {
                        contractName: 'My Contract',
                        evmVersion: 'london',
                        compilerVersion: 'compiler',
                        runs: 200,
                        sources: [{ fileName: 'File.sol', content: 'i am solidity code' }]
                    }
                }
            },
            global: {
                plugins: [createTestingPinia({ initialState: { explorer: { id: 1, slug: 'ethernal' } } })],
                stubs: stubs,
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display without optimizer runs', async () => {
        const wrapper = mount(ContractVerificationInfo, {
            props: {
                contract: {
                    bytecode: '0x60',
                    asm: 'abc',
                    abi: require('../fixtures/NFTCollectibleABI.json'),
                    verificationStatus: 'success',
                    verification: {
                        contractName: 'My Contract',
                        evmVersion: 'london',
                        compilerVersion: 'compiler',
                        sources: [{ fileName: 'File.sol', content: 'i am solidity code' }]
                    }
                }
            },
            global: {
                plugins: [createTestingPinia({ initialState: { explorer: { id: 1, slug: 'ethernal' } } })],
                stubs: stubs,
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should toggle constructor arguments format', async () => {
        const wrapper = mount(ContractVerificationInfo, {
            props: {
                contract: {
                    bytecode: '0x60',
                    asm: 'abc',
                    abi: require('../fixtures/NFTCollectibleABI.json'),
                    verificationStatus: 'success',
                    verification: {
                        contractName: 'My Contract',
                        evmVersion: 'london',
                        compilerVersion: 'compiler',
                        runs: 200,
                        constructorArguments: '0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000046162636400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000005000000000000000000000000000000000000000000000000000000000000000461626364000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001610000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016200000000000000000000000000000000000000000000000000000000000000',
                        sources: [{ fileName: 'File.sol', content: 'i am solidity code' }]
                    }
                }
            },
            global: {
                plugins: [createTestingPinia({ initialState: { explorer: { id: 1, slug: 'ethernal' } } })],
                stubs: stubs,
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();

        await wrapper.find('a:last-child').trigger('click');
        expect(wrapper.html()).toMatchSnapshot();
    });
});
