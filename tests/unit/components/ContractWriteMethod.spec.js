import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import { useWalletStore } from '@/stores/walletStore';

import DSProxyFactoryContract from '../fixtures/DSProxyFactoryContract.json';

describe('ContractWriteMethod.vue', () => {
    it('Should send the transaction with Metamask if senderMode is metamask', async () => {
        const { default: ContractWriteMethod } = await import('@/components/ContractWriteMethod.vue');

        const props = {
            senderMode: 'metamask',
            method: DSProxyFactoryContract.abi[2],
            active: true,
            contract: DSProxyFactoryContract,
            signature: 'build()',
            options: {
                from: { address: '0xa26e15c895efc0616177b7c1e7270a4c7d51c997' },
                gasLimit: '6721975',
                gasPrice: undefined
            }
        };

        const pinia = createTestingPinia();
        const workspaceStore = useCurrentWorkspaceStore(pinia);
        const walletStore = useWalletStore(pinia);

        workspaceStore.networkId = '1';
        workspaceStore.chain = { token: 'ETH' };
        workspaceStore.getViemBrowserClient = {
            writeContract: vi.fn().mockResolvedValue('0x1234')
        };
        workspaceStore.getViemPublicClient = {
            waitForTransactionReceipt: vi.fn().mockResolvedValue({
                status: 'success'
            }),
            simulateContract: vi.fn().mockResolvedValue({
                request: {}
            })
        };

        walletStore.wagmiConnector = {};
        walletStore.connectedAddress = '0xa26e15c895efc0616177b7c1e7270a4c7d51c997';

        const wrapper = mount(ContractWriteMethod, {
            props,
            global: {
                plugins: [pinia]
            }
        });

        await flushPromises();

        await wrapper.find('button').trigger('click');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the UI to interact with a method', async () => {
        const props = {
            senderMode: 'accounts',
            method: DSProxyFactoryContract.abi[2],
            contract: DSProxyFactoryContract,
            signature: 'build()',
            options: {
                from: { address: '0xa26e15c895efc0616177b7c1e7270a4c7d51c997' },
                gasLimit: '6721975',
                gasPrice: undefined
            },
            active: true
        };

        const { default: ContractWriteMethod } = await import('@/components/ContractWriteMethod.vue');

        const pinia = createTestingPinia();
        const workspaceStore = useCurrentWorkspaceStore(pinia);
        const walletStore = useWalletStore(pinia);

        workspaceStore.chain = { token: 'ETH' };
        walletStore.wagmiConnector = {};
        walletStore.connectedAddress = '0xa26e15c895efc0616177b7c1e7270a4c7d51c997';

        const wrapper = mount(ContractWriteMethod, {
            props,
            global: {
                plugins: [pinia]
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should make the UI unavailable if not active', async () => {
        const props = {
            senderMode: 'accounts',
            method: {
                "inputs": [
                    {
                        "internalType": "uint256[]",
                        "name": "values",
                        "type": "uint256[]"
                    }
                ],
                "name": "reproWriteBug",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            contract: DSProxyFactoryContract,
            signature: 'build()',
            options: {
                from: { address: '0xa26e15c895efc0616177b7c1e7270a4c7d51c997' },
                gasLimit: '6721975',
                gasPrice: undefined
            },
            active: false
        };

        const { default: ContractWriteMethod } = await import('@/components/ContractWriteMethod.vue');

        const pinia = createTestingPinia();
        const workspaceStore = useCurrentWorkspaceStore(pinia);
        const walletStore = useWalletStore(pinia);

        workspaceStore.chain = { token: 'ETH' };
        walletStore.wagmiConnector = {};
        walletStore.connectedAddress = '0xa26e15c895efc0616177b7c1e7270a4c7d51c997';

        const wrapper = mount(ContractWriteMethod, {
            props,
            global: {
                plugins: [pinia]
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should accept true as an input for bool type', async () => {
        const props = {
            senderMode: 'metamask',
            method: {
                "inputs": [
                    {
                        "internalType": "bool",
                        "name": "boolInp",
                        "type": "bool"
                    }
                ],
                "name": "boolFun",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            contract: DSProxyFactoryContract,
            signature: 'build()',
            options: {
                from: { address: '0xa26e15c895efc0616177b7c1e7270a4c7d51c997' },
                gasLimit: '6721975',
                gasPrice: undefined
            },
            active: true
        };

        const { default: ContractWriteMethod } = await import('@/components/ContractWriteMethod.vue');

        const pinia = createTestingPinia();
        const workspaceStore = useCurrentWorkspaceStore(pinia);
        const walletStore = useWalletStore(pinia);

        workspaceStore.networkId = '1';
        workspaceStore.chain = { token: 'ETH' };
        workspaceStore.getViemBrowserClient = {
            writeContract: vi.fn().mockResolvedValue('0xabcd')
        };
        workspaceStore.getViemPublicClient = {
            waitForTransactionReceipt: vi.fn().mockResolvedValue({
                status: 'success'
            }),
            simulateContract: vi.fn().mockResolvedValue({
                request: {}
            })
        };

        walletStore.wagmiConnector = {};
        walletStore.connectedAddress = '0xa26e15c895efc0616177b7c1e7270a4c7d51c997';

        const wrapper = mount(ContractWriteMethod, {
            props,
            global: {
                plugins: [pinia]
            }
        });

        await wrapper.find('input').setValue('true');
        await wrapper.find('button').trigger('click');
        await flushPromises();

        expect(wrapper.vm.result).toEqual({ txHash: '0xabcd', message: null });
        expect(wrapper.vm.receipt).toEqual({ status: 'success' });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should accept false as an input for bool type', async () => {
        const props = {
            senderMode: 'metamask',
            method: {
                "inputs": [
                    {
                        "internalType": "bool",
                        "name": "boolInp",
                        "type": "bool"
                    }
                ],
                "name": "boolFun",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            contract: DSProxyFactoryContract,
            signature: 'build()',
            options: {
                from: { address: '0xa26e15c895efc0616177b7c1e7270a4c7d51c997' },
                gasLimit: '6721975',
                gasPrice: undefined
            },
            active: true
        };

        const { default: ContractWriteMethod } = await import('@/components/ContractWriteMethod.vue');

        const pinia = createTestingPinia();
        const workspaceStore = useCurrentWorkspaceStore(pinia);
        const walletStore = useWalletStore(pinia);

        workspaceStore.networkId = '1';
        workspaceStore.chain = { token: 'ETH' };
        workspaceStore.getViemBrowserClient = {
            writeContract: vi.fn().mockResolvedValue('0xabcd')
        };
        workspaceStore.getViemPublicClient = {
            waitForTransactionReceipt: vi.fn().mockResolvedValue({
                status: 'success'
            }),
            simulateContract: vi.fn().mockResolvedValue({
                request: {}
            })
        };

        walletStore.wagmiConnector = {};
        walletStore.connectedAddress = '0xa26e15c895efc0616177b7c1e7270a4c7d51c997';

        const wrapper = mount(ContractWriteMethod, {
            props,
            global: {
                plugins: [pinia]
            }
        });

        await wrapper.find('input').setValue('false');
        await wrapper.find('button').trigger('click');
        await flushPromises();

        expect(wrapper.vm.result).toEqual({ txHash: '0xabcd', message: null });
        expect(wrapper.vm.receipt).toEqual({ status: 'success' });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle array input properly', async () => {
        const props = {
            senderMode: 'metamask',
            method: {
                "inputs": [
                    {
                        "internalType": "uint256[]",
                        "name": "values",
                        "type": "uint256[]"
                    }
                ],
                "name": "reproWriteBug",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            contract: DSProxyFactoryContract,
            signature: 'build()',
            options: {
                from: { address: '0xa26e15c895efc0616177b7c1e7270a4c7d51c997' },
                gasLimit: '6721975',
                gasPrice: undefined
            },
            active: true
        };

        const { default: ContractWriteMethod } = await import('@/components/ContractWriteMethod.vue');

        const pinia = createTestingPinia();
        const workspaceStore = useCurrentWorkspaceStore(pinia);
        const walletStore = useWalletStore(pinia);

        workspaceStore.networkId = '1';
        workspaceStore.chain = { token: 'ETH' };
        workspaceStore.getViemBrowserClient = {
            writeContract: vi.fn().mockResolvedValue('0xabcd')
        };
        workspaceStore.getViemPublicClient = {
            waitForTransactionReceipt: vi.fn().mockResolvedValue({
                status: 'success'
            }),
            simulateContract: vi.fn().mockResolvedValue({
                request: {}
            })
        };

        walletStore.wagmiConnector = {};
        walletStore.connectedAddress = '0xa26e15c895efc0616177b7c1e7270a4c7d51c997';

        const wrapper = mount(ContractWriteMethod, {
            props,
            global: {
                plugins: [pinia]
            }
        });

        await wrapper.find('input').setValue('[1,2]');
        await wrapper.find('button').trigger('click');
        await flushPromises();

        expect(wrapper.vm.result).toEqual({ txHash: '0xabcd', message: null });
        expect(wrapper.vm.receipt).toEqual({ status: 'success' });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the tx hash and status when it succeeds with a receipt', async () => {
        const props = {
            senderMode: 'metamask',
            method: DSProxyFactoryContract.abi[2],
            contract: DSProxyFactoryContract,
            signature: 'build()',
            options: {
                from: { address: '0xa26e15c895efc0616177b7c1e7270a4c7d51c997' },
                gasLimit: '6721975',
                gasPrice: undefined
            },
            active: true
        };

        const { default: ContractWriteMethod } = await import('@/components/ContractWriteMethod.vue');

        const pinia = createTestingPinia();
        const workspaceStore = useCurrentWorkspaceStore(pinia);
        const walletStore = useWalletStore(pinia);

        workspaceStore.networkId = '1';
        workspaceStore.chain = { token: 'ETH' };
        workspaceStore.getViemBrowserClient = {
            writeContract: vi.fn().mockResolvedValue('0xabcd')
        };
        workspaceStore.getViemPublicClient = {
            waitForTransactionReceipt: vi.fn().mockResolvedValue({
                status: 'success'
            }),
            simulateContract: vi.fn().mockResolvedValue({
                request: {}
            })
        };

        walletStore.wagmiConnector = {};
        walletStore.connectedAddress = '0xa26e15c895efc0616177b7c1e7270a4c7d51c997';

        const wrapper = mount(ContractWriteMethod, {
            props,
            global: {
                plugins: [pinia]
            }
        });

        await wrapper.find('button').trigger('click');
        await flushPromises();

        expect(wrapper.vm.result).toEqual({ txHash: '0xabcd', message: null });
        expect(wrapper.vm.receipt).toEqual({ status: 'success' });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display only the error message with the failed tx hash', async () => {
        const props = {
            senderMode: 'metamask',
            method: DSProxyFactoryContract.abi[2],
            contract: DSProxyFactoryContract,
            signature: 'build()',
            options: {
                from: { address: '0xa26e15c895efc0616177b7c1e7270a4c7d51c997' },
                gasLimit: '6721975',
                gasPrice: undefined
            },
            active: true
        };

        const { default: ContractWriteMethod } = await import('@/components/ContractWriteMethod.vue');

        const pinia = createTestingPinia();
        const workspaceStore = useCurrentWorkspaceStore(pinia);
        const walletStore = useWalletStore(pinia);

        workspaceStore.networkId = '1';
        workspaceStore.chain = { token: 'ETH' };
        workspaceStore.getViemBrowserClient = {
            writeContract: vi.fn().mockResolvedValue('0xabcd')
        };
        workspaceStore.getViemPublicClient = {
            waitForTransactionReceipt: vi.fn().mockResolvedValue({
                status: 'reverted'
            }),
            simulateContract: vi.fn().mockRejectedValue({
                shortMessage: 'Wrong param.'
            })
        };

        walletStore.wagmiConnector = {};
        walletStore.connectedAddress = '0xa26e15c895efc0616177b7c1e7270a4c7d51c997';

        const wrapper = mount(ContractWriteMethod, {
            props,
            global: {
                plugins: [pinia]
            }
        });

        await wrapper.find('button').trigger('click');
        await flushPromises();

        expect(wrapper.vm.result).toStrictEqual({ txHash: '0xabcd', message: 'Transaction failed with error: Wrong param.' });
        expect(wrapper.vm.receipt).toStrictEqual({ status: 'reverted' });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display only the error message if the tx cannot be sent', async () => {
        const props = {
            senderMode: 'metamask',
            method: DSProxyFactoryContract.abi[2],
            contract: DSProxyFactoryContract,
            signature: 'build()',
            options: {
                from: { address: '0xa26e15c895efc0616177b7c1e7270a4c7d51c997' },
                gasLimit: '6721975',
                gasPrice: undefined
            },
            active: true
        };

        const { default: ContractWriteMethod } = await import('@/components/ContractWriteMethod.vue');

        const pinia = createTestingPinia();
        const workspaceStore = useCurrentWorkspaceStore(pinia);
        const walletStore = useWalletStore(pinia);

        workspaceStore.networkId = '1';
        workspaceStore.chain = { token: 'ETH' };
        workspaceStore.getViemBrowserClient = {
            writeContract: vi.fn().mockRejectedValue({
                message: 'call revert exception'
            })
        };
        workspaceStore.getViemPublicClient = {
            simulateContract: vi.fn().mockRejectedValue({
                message: 'call revert exception'
            })
        };

        walletStore.wagmiConnector = {};
        walletStore.connectedAddress = '0xa26e15c895efc0616177b7c1e7270a4c7d51c997';

        const wrapper = mount(ContractWriteMethod, {
            props,
            global: {
                plugins: [pinia]
            }
        });

        await wrapper.find('button').trigger('click');
        await flushPromises();

        expect(wrapper.vm.result).toStrictEqual({ txHash: null, message: 'Error: call revert exception' });
        expect(wrapper.vm.receipt).toStrictEqual(null);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should simulate the transaction before sending if simulate is checked', async () => {
        const props = {
            senderMode: 'metamask',
            method: DSProxyFactoryContract.abi[2],
            contract: DSProxyFactoryContract,
            signature: 'build()',
            options: {
                from: { address: '0xa26e15c895efc0616177b7c1e7270a4c7d51c997' },
                gasLimit: '6721975',
                gasPrice: undefined
            },
            active: true
        };

        const { default: ContractWriteMethod } = await import('@/components/ContractWriteMethod.vue');

        const pinia = createTestingPinia();
        const workspaceStore = useCurrentWorkspaceStore(pinia);
        const walletStore = useWalletStore(pinia);

        workspaceStore.networkId = '1';
        workspaceStore.chain = { token: 'ETH' };
        workspaceStore.getViemBrowserClient = {
            writeContract: vi.fn().mockResolvedValue('0xabcd')
        };
        workspaceStore.getViemPublicClient = {
            waitForTransactionReceipt: vi.fn().mockResolvedValue({
                status: 'success'
            }),
            simulateContract: vi.fn().mockResolvedValue({
                request: {}
            })
        };

        walletStore.wagmiConnector = {};
        walletStore.connectedAddress = '0xa26e15c895efc0616177b7c1e7270a4c7d51c997';

        const wrapper = mount(ContractWriteMethod, {
            props,
            global: {
                plugins: [pinia]
            }
        });

        await wrapper.find('input[type="checkbox"]').setValue(true);
        await wrapper.find('button').trigger('click');
        await flushPromises();

        expect(workspaceStore.getViemPublicClient.simulateContract).toHaveBeenCalled();
        expect(wrapper.vm.result).toEqual({ txHash: '0xabcd', message: null });
        expect(wrapper.vm.receipt).toEqual({ status: 'success' });
        expect(wrapper.html()).toMatchSnapshot();
    });
});
