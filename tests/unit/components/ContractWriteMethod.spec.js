import flushPromises from 'flush-promises';

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
            contract: DSProxyFactoryContract,
            signature: 'build()',
            options: {
                from: { address: '0xa26e15c895efc0616177b7c1e7270a4c7d51c997' },
                gasLimit: '6721975',
                gasPrice: undefined
            }
        };

        const wrapper = mount(ContractWriteMethod, {
            props: {
                ...props,
                senderMode: 'metamask'
            },
            global: {
                plugins: [createTestingPinia({ initialState: {
                    wallet: { connectedAddress: '0x123', wagmiConnector: {} },
                    currentWorkspace: { wagmiConfig: {} }
                }})]
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

        const wrapper = mount(ContractWriteMethod, {
            props: props,
            global: {
                plugins: [createTestingPinia({ initialState: {
                    wallet: { connectedAddress: '0x123', wagmiConnector: {} },
                    currentWorkspace: { wagmiConfig: {} }
                }})]
            }
        });

        await wrapper.find('input').setValue('true');
        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toEqual({ txHash: '0xabcd', message: null });
        expect(wrapper.vm.receipt).toEqual({ status: true });
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

        const wrapper = mount(ContractWriteMethod, {
            props: props,
            global: {
                plugins: [createTestingPinia({ initialState: {
                    wallet: { connectedAddress: '0x123', wagmiConnector: {} },
                    currentWorkspace: { wagmiConfig: {} }
                }})]
            }
        });

        await wrapper.find('input').setValue('false');
        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toEqual({ txHash: '0xabcd', message: null });
        expect(wrapper.vm.receipt).toEqual({ status: true });
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

        const wrapper = mount(ContractWriteMethod, {
            props: props,
            global: {
                plugins: [createTestingPinia({ initialState: {
                    wallet: { connectedAddress: '0x123', wagmiConnector: {} },
                    currentWorkspace: { wagmiConfig: {} }
                }})]
            }
        });

        await wrapper.find('input').setValue('frbbforbuo');
        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toEqual({ txHash: null, message: "Input needs to be 'true' or 'false'" });
        expect(wrapper.vm.receipt).toEqual({});
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

        const wrapper = mount(ContractWriteMethod, {
            props: props,
            global: {
                plugins: [createTestingPinia({ initialState: {
                    wallet: { connectedAddress: '0x123', wagmiConnector: {} },
                    currentWorkspace: { wagmiConfig: {} }
                }})]
            }
        });

        await wrapper.find('input').setValue('[1,2]');
        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toEqual({ txHash: '0xabcd', message: null });
        expect(wrapper.vm.receipt).toEqual({ status: true });
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

        const wrapper = mount(ContractWriteMethod, {
            props: props,
            global: {
                plugins: [createTestingPinia({ initialState: {
                    wallet: { connectedAddress: '0x123', wagmiConnector: {} },
                    currentWorkspace: { wagmiConfig: {} }
                }})]
            }
        });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toEqual({ txHash: '0xabcd', message: null });
        expect(wrapper.vm.receipt).toEqual({ status: true });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display only the tx hash when it succeeds without a receipt', async () => {
        vi.spyOn(server, 'callContractWriteMethod')
            .mockResolvedValue({ hash: '0xabcd' });

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

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toEqual({ txHash: '0xabcd', message: null });
        expect(wrapper.vm.receipt).toEqual({});
        expect(wrapper.vm.noReceipt).toBe(true);
        expect(wrapper.vm.noWaitFunction).toBe(true);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display only the error message with the failed tx hash', async () => {
        vi.spyOn(server, 'callContractWriteMethod')
            .mockRejectedValue({
                data: {
                    '0xabcd': {
                        error: 'Failed tx.',
                        reason: 'Wrong param.'
                    }
                }
            })

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

        const wrapper = mount(ContractWriteMethod, {
            props: props,
            global: {
                plugins: [createTestingPinia({ initialState: {
                    wallet: { connectedAddress: '0x123', wagmiConnector: {} },
                    currentWorkspace: { wagmiConfig: {} }
                }})]
            }
        });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toStrictEqual({ txHash: '0xabcd', message: 'Error: Wrong param.' });
        expect(wrapper.vm.receipt).toStrictEqual({});
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the formatted error message with the failed tx hash', async () => {
        vi.spyOn(server, 'callContractWriteMethod')
            .mockRejectedValue({
                data: {
                    '0xabcd': {
                        error: 'revert',
                        return: '0xcf4791810000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b'
                    }
                }
            })

        const props = {
            method: TokenContract.abi[1],
            contract: TokenContract,
            options: {
                from: { address: '0x0' },
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
        const to = wrapper.findAll('input').at(0);
        await to.setValue('0xabcd');

        const amount = wrapper.findAll('input').at(1);
        await amount.setValue('1234');

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toStrictEqual({ txHash: '0xabcd', message: 'Error: InsufficientBalance(uint256 available: 0, uint256 required: 123)' });
        expect(wrapper.vm.receipt).toStrictEqual({});
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display only the error message if there is no tx hash', async () => {
        vi.spyOn(server, 'callContractWriteMethod')
            .mockRejectedValue({
                message: 'Failed tx'
            })

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

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toStrictEqual({ txHash: null, message: 'Error: Failed tx' });
        expect(wrapper.vm.receipt).toStrictEqual({});
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

        const wrapper = mount(ContractWriteMethod, {
            props: props,
            global: {
                plugins: [createTestingPinia({ initialState: {
                    wallet: { connectedAddress: '0x123', wagmiConnector: {} },
                    currentWorkspace: { wagmiConfig: {} }
                }})]
            }
        });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toStrictEqual({ txHash: null, message: 'Error: call revert exception' });
        expect(wrapper.vm.receipt).toStrictEqual({});
        expect(wrapper.html()).toMatchSnapshot();
    });
});
