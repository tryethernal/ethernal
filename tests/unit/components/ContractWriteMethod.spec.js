import flushPromises from 'flush-promises';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';

import DSProxyFactoryContract from '../fixtures/DSProxyFactoryContract.json';
import TokenContract from '../fixtures/TokenContract.json';

describe('ContractWriteMethod.vue', () => {
    it('Should send the transaction with Metamask if senderMode is metamask', async () => {
        vi.doMock('@web3-onboard/wagmi', () => ({
            writeContract: vi.fn().mockResolvedValueOnce('0x1234')
        }));

        const { default: ContractWriteMethod } = await import('@/components/ContractWriteMethod.vue');

        const props = {
            senderMode: 'accounts',
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

        const workspaceStore = useCurrentWorkspaceStore(createTestingPinia());

        workspaceStore.wallet = { connectedAddress: '0x123', wagmiConnector: {} };
        workspaceStore.wagmiConfig = {};
        workspaceStore.rpcServer = 'http://localhost';
        workspaceStore.getViemBrowserClient = {
            writeContract: vi.fn().mockResolvedValue('0x1234')
        };
        workspaceStore.getViemPublicClient = {
            waitForTransactionReceipt: vi.fn().mockResolvedValue({
                status: 'success'
            })
        };

        const wrapper = mount(ContractWriteMethod, {
            props: {
                ...props,
                senderMode: 'metamask'
            },
            global: {
                plugins: [workspaceStore]
            }
        });

        await flushPromises();

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

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

        const wrapper = mount(ContractWriteMethod, {
            props: props,
            global: {
                plugins: [createTestingPinia({ initialState: {
                    wallet: { connectedAddress: '0x123', wagmiConnector: {} },
                    currentWorkspace: { wagmiConfig: {} }
                }})]
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should make the UI unavailable if not account connected flag', async () => {
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

        const wrapper = mount(ContractWriteMethod, {
            props: props,
            global: {
                plugins: [createTestingPinia({ initialState: {
                    wallet: { wagmiConnector: {} },
                    currentWorkspace: { wagmiConfig: {} }
                }})]
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should accept true as an input for bool type', async () => {
        const props = {
            senderMode: 'accounts',
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

        const workspaceStore = useCurrentWorkspaceStore(createTestingPinia());

        workspaceStore.wallet = { connectedAddress: '0x123', wagmiConnector: {} };
        workspaceStore.wagmiConfig = {};
        workspaceStore.rpcServer = 'http://localhost';
        workspaceStore.getViemBrowserClient = {
            writeContract: vi.fn().mockResolvedValue('0xabcd')
        };
        workspaceStore.getViemPublicClient = {
            waitForTransactionReceipt: vi.fn().mockResolvedValue({
                status: 'success'
            })
        };

        const wrapper = mount(ContractWriteMethod, {
            props: {
                ...props,
                senderMode: 'metamask'
            },
            global: {
                plugins: [workspaceStore]
            }
        });

        await wrapper.find('input').setValue('true');
        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toEqual({ txHash: '0xabcd', message: null });
        expect(wrapper.vm.receipt).toEqual({ status: 'success' });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should accept false as an input for bool type', async () => {
        const props = {
            senderMode: 'accounts',
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

        const workspaceStore = useCurrentWorkspaceStore(createTestingPinia());

        workspaceStore.wallet = { connectedAddress: '0x123', wagmiConnector: {} };
        workspaceStore.wagmiConfig = {};
        workspaceStore.rpcServer = 'http://localhost';
        workspaceStore.getViemBrowserClient = {
            writeContract: vi.fn().mockResolvedValue('0xabcd')
        };
        workspaceStore.getViemPublicClient = {
            waitForTransactionReceipt: vi.fn().mockResolvedValue({
                status: 'success'
            })
        };

        const wrapper = mount(ContractWriteMethod, {
            props: {
                ...props,
                senderMode: 'metamask'
            },
            global: {
                plugins: [workspaceStore]
            }
        });

        await wrapper.find('input').setValue('false');
        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toEqual({ txHash: '0xabcd', message: null });
        expect(wrapper.vm.receipt).toEqual({ status: 'success' });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should throw an error for bool type if input is not true or false', async () => {
        const props = {
            senderMode: 'accounts',
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

        const workspaceStore = useCurrentWorkspaceStore(createTestingPinia());

        workspaceStore.wallet = { connectedAddress: '0x123', wagmiConnector: {} };
        workspaceStore.wagmiConfig = {};
        workspaceStore.rpcServer = 'http://localhost';
        workspaceStore.getViemBrowserClient = {
            writeContract: vi.fn().mockResolvedValue('0xabcd')
        };
        workspaceStore.getViemPublicClient = {
            waitForTransactionReceipt: vi.fn().mockResolvedValue({
                status: 'success'
            })
        };

        const wrapper = mount(ContractWriteMethod, {
            props: {
                ...props,
                senderMode: 'metamask'
            },
            global: {
                plugins: [workspaceStore]
            }
        });
        await wrapper.find('input').setValue('frbbforbuo');
        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toEqual({ txHash: null, message: "Input needs to be 'true' or 'false'" });
        expect(wrapper.vm.receipt).toEqual(null);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle array input properly', async () => {
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
            active: true
        };

        const { default: ContractWriteMethod } = await import('@/components/ContractWriteMethod.vue');

        const workspaceStore = useCurrentWorkspaceStore(createTestingPinia());

        workspaceStore.wallet = { connectedAddress: '0x123', wagmiConnector: {} };
        workspaceStore.wagmiConfig = {};
        workspaceStore.rpcServer = 'http://localhost';
        workspaceStore.getViemBrowserClient = {
            writeContract: vi.fn().mockResolvedValue('0xabcd')
        };
        workspaceStore.getViemPublicClient = {
            waitForTransactionReceipt: vi.fn().mockResolvedValue({
                status: 'success'
            })
        };

        const wrapper = mount(ContractWriteMethod, {
            props: {
                ...props,
                senderMode: 'metamask'
            },
            global: {
                plugins: [workspaceStore]
            }
        });

        await wrapper.find('input').setValue('[1,2]');
        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toEqual({ txHash: '0xabcd', message: null });
        expect(wrapper.vm.receipt).toEqual({ status: 'success' });
        expect(wrapper.html()).toMatchSnapshot();
    })

    it('Should display the tx hash and status when it succeeds with a receipt', async () => {
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

        const workspaceStore = useCurrentWorkspaceStore(createTestingPinia());

        workspaceStore.wallet = { connectedAddress: '0x123', wagmiConnector: {} };
        workspaceStore.wagmiConfig = {};
        workspaceStore.rpcServer = 'http://localhost';
        workspaceStore.getViemBrowserClient = {
            writeContract: vi.fn().mockResolvedValue('0xabcd')
        };
        workspaceStore.getViemPublicClient = {
            waitForTransactionReceipt: vi.fn().mockResolvedValue({
                status: 'success'
            })
        };

        const wrapper = mount(ContractWriteMethod, {
            props: {
                ...props,
                senderMode: 'metamask'
            },
            global: {
                plugins: [workspaceStore]
            }
        });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toEqual({ txHash: '0xabcd', message: null });
        expect(wrapper.vm.receipt).toEqual({ status: 'success' });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display only the error message with the failed tx hash', async () => {
        const { default: ContractWriteMethod } = await import('@/components/ContractWriteMethod.vue');

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

        const workspaceStore = useCurrentWorkspaceStore(createTestingPinia());

        workspaceStore.wallet = { connectedAddress: '0x123', wagmiConnector: {} };
        workspaceStore.wagmiConfig = {};
        workspaceStore.rpcServer = 'http://localhost';
        workspaceStore.getViemBrowserClient = {
            writeContract: vi.fn().mockResolvedValue('0xabcd')
        };
        workspaceStore.getViemPublicClient = {
            waitForTransactionReceipt: vi.fn().mockResolvedValue({
                status: 'reverted',
            }),
            simulateContract: vi.fn().mockRejectedValue({
                shortMessage: 'Wrong param.'
            })
        };

        const wrapper = mount(ContractWriteMethod, {
            props: {
                ...props,
                senderMode: 'metamask'
            },
            global: {
                plugins: [workspaceStore]
            }
        });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toStrictEqual({ txHash: '0xabcd', message: 'Transaction failed with error: Wrong param.' });
        expect(wrapper.vm.receipt).toStrictEqual({ status: 'reverted' });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display only the error message if the tx cannot be sent', async () => {
        vi.spyOn(server, 'callContractWriteMethod').mockImplementation(function() {
            throw { reason: 'call revert exception (method="feeTo()", errorSignature=null, errorArgs=[null], reason=null, code=CALL_EXCEPTION, version=abi/5.0.9)' };
        });

        const { default: ContractWriteMethod } = await import('@/components/ContractWriteMethod.vue');

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

        const workspaceStore = useCurrentWorkspaceStore(createTestingPinia());

        workspaceStore.wallet = { connectedAddress: '0x123', wagmiConnector: {} };
        workspaceStore.wagmiConfig = {};
        workspaceStore.rpcServer = 'http://localhost';
        workspaceStore.getViemBrowserClient = {
            writeContract: vi.fn().mockRejectedValue({
                message: 'call revert exception'
            })
        };

        const wrapper = mount(ContractWriteMethod, {
            props: {
                ...props,
                senderMode: 'metamask'
            },
            global: {
                plugins: [workspaceStore]
            }
        });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toStrictEqual({ txHash: null, message: 'Error: call revert exception' });
        expect(wrapper.vm.receipt).toStrictEqual(null);
        expect(wrapper.html()).toMatchSnapshot();
    });
});
