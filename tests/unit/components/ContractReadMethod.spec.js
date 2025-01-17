import ContractReadMethod from '@/components/ContractReadMethod.vue';
import DSProxyFactoryContract from '../fixtures/DSProxyFactoryContract.json';

describe('ContractReadMethod.vue', () => {
    it('Should display the UI to interact with a method', () => {
        const props = {
            method: DSProxyFactoryContract.abi[0],
            contract: DSProxyFactoryContract,
            active: true,
            options: {
                from: '0x0',
                gasLimit: '6721975',
                gasPrice: undefined
            }
        };

        const wrapper = mount(ContractReadMethod, {
            props: props,
            global: {
                stubs: ['Formatted-Sol-Var']
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should work when input is any array', async () => {
        vi.spyOn(server, 'callContractReadMethod')
            .mockResolvedValueOnce([[1, 2]]);

        const props = {
            method: {
                "inputs": [
                    {
                        "internalType": "uint256[]",
                        "name": "values",
                        "type": "uint256[]"
                    }
                ],
                "name": "reproBug",
                "outputs": [
                    {
                        "internalType": "uint256[]",
                        "name": "",
                        "type": "uint256[]"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": true
            },
            contract: DSProxyFactoryContract,
            active: true,
            options: {
                from: '0x0',
                gasLimit: '6721975',
                gasPrice: undefined
            }
        };

        const wrapper = mount(ContractReadMethod, {
            props: props,
            global: {
                stubs: ['Formatted-Sol-Var']
            }
        });

        await wrapper.find('input').setValue('[1,2]');
        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.results.length).toEqual(1);
        expect(wrapper.vm.results).toEqual([
            {
                input: {
                    internalType: "uint256[]",
                    name: '',
                    type: 'uint256[]'
                },
                value: [1, 2]
            }
        ]);
        expect(wrapper.html()).toMatchSnapshot();
    })

    it('Should return the result when interacting with the method', async () => {
        const props = {
            method: DSProxyFactoryContract.abi[0],
            contract: DSProxyFactoryContract,
            active: true,
            options: {
                from: '0x0',
                gasLimit: '6721975',
                gasPrice: undefined
            }
        };

        vi.spyOn(server, 'callContractReadMethod')
            .mockResolvedValueOnce(['true']);

        const wrapper = mount(ContractReadMethod, {
            props: props,
            global: {
                stubs: ['Formatted-Sol-Var']
            }
        });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.results).toEqual([
            {
                input: {
                    name: '',
                    type: 'bool'
                },
                value: 'true'
            }
        ]);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should work when it is in public explorer mode', async () => {
        const props = {
            method: DSProxyFactoryContract.abi[0],
            contract: DSProxyFactoryContract,
            active: true,
            options: {
                from: '0x0',
                gasLimit: '6721975',
                gasPrice: undefined
            }
        };

        vi.spyOn(server, 'callContractReadMethod')
            .mockResolvedValueOnce(['true']);

        window.ethereum = vi.fn().mockReturnValueOnce({});

        const wrapper = mount(ContractReadMethod, {
            props: props,
            global: {
                plugins: [createTestingPinia({ initialState: { explorer: { id: 1 } } })],
                stubs: ['Formatted-Sol-Var']
            }
        });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.results).toEqual([
            {
                input: {
                    name: '',
                    type: 'bool'
                },
                value: 'true'
            }
        ]);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the result even if it is not an array', async () => {
        vi.spyOn(server, 'callContractReadMethod')
            .mockResolvedValueOnce(['1234']);

        const props = {
            method: {
                "inputs": [],
                "name": "returnAnUInt",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": true
            },
            contract: DSProxyFactoryContract,
            active: true,
            options: {
                from: '0x0',
                gasLimit: '6721975',
                gasPrice: undefined
            }
        };

        const wrapper = mount(ContractReadMethod, {
            props: props,
            global: {
                stubs: ['Formatted-Sol-Var']
            }
        });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.results).toEqual([
            {
                input: {
                    internalType: "uint256",
                    name: '',
                    type: 'uint256'
                },
                value: '1234'
            }
        ]);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle big number results', async () => {
        vi.spyOn(server, 'callContractReadMethod')
            .mockResolvedValueOnce(['50000000000000000000']);

        const props = {
            method: {
                "inputs": [],
                "name": "returnAnUInt",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": true
            },
            contract: DSProxyFactoryContract,
            active: true,
            options: {
                from: '0x0',
                gasLimit: '6721975',
                gasPrice: undefined
            }
        };

        const wrapper = mount(ContractReadMethod, {
            props: props,
            global: {
                stubs: ['Formatted-Sol-Var']
            }
        });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.results).toEqual([
            {
                input: {
                    internalType: "uint256",
                    name: '',
                    type: 'uint256'
                },
                value: '50000000000000000000'
            }
        ]);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle multiple results', async () => {
        vi.spyOn(server, 'callContractReadMethod')
            .mockResolvedValueOnce(['1', '2']);

        const props = {
            method: {
                "inputs": [],
                "name": "returnAnUInt",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": true
            },
            contract: DSProxyFactoryContract,
            active: true,
            options: {
                from: '0x0',
                gasLimit: '6721975',
                gasPrice: undefined
            }
        };

        const wrapper = mount(ContractReadMethod, {
            props: props,
            global: {
                stubs: ['Formatted-Sol-Var']
            }
        });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.results).toEqual([
            {
                input: {
                    internalType: "uint256",
                    name: '',
                    type: 'uint256'
                },
                value: '1'
            },
            {
                input: {
                    internalType: "uint256",
                    name: '',
                    type: 'uint256'
                },
                value: '2'
            }
        ]);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the error message if one is returned', async () => {
        vi.spyOn(server, 'callContractReadMethod')
            .mockRejectedValueOnce({ reason: 'Wrong parameters' });

        const props = {
            method: DSProxyFactoryContract.abi[0],
            contract: DSProxyFactoryContract,
            active: true,
            options: {
                from: '0x0',
                gasLimit: '6721975',
                gasPrice: undefined
            }
        };

        const wrapper = mount(ContractReadMethod, {
            props: props,
            global: {
                stubs: ['Formatted-Sol-Var']
            }
        });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.error).toEqual('Wrong parameters');
        expect(wrapper.vm.results).toEqual([]);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display a generic error message if the function fails', async () => {
        vi.spyOn(server, 'callContractReadMethod')
            .mockImplementationOnce(() => { throw 'Error' });

        const props = {
            method: DSProxyFactoryContract.abi[0],
            contract: DSProxyFactoryContract,
            active: true,
            options: {
                from: '0x0',
                gasLimit: '6721975',
                gasPrice: undefined
            }
        };

        const wrapper = mount(ContractReadMethod, {
            props: props,
            global: {
                stubs: ['Formatted-Sol-Var']
            }
        });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.error).toEqual('Error while calling the method');
        expect(wrapper.vm.results).toEqual([]);
        expect(wrapper.html()).toMatchSnapshot();
    });
});
