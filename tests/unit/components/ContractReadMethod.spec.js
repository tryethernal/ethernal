import MockHelper from '../MockHelper';

import ContractReadMethod from '@/components/ContractReadMethod.vue';
import DSProxyFactoryContract from '../fixtures/DSProxyFactoryContract.json';

describe('ContractReadMethod.vue', () => {
    let helper, props;

    beforeEach(() => {
        helper = new MockHelper({ rpcServer: 'http://localhost:8545' });
        props = {
            method: DSProxyFactoryContract.abi[0],
            contract: DSProxyFactoryContract,
            active: true,
            options: {
                from: '0x0',
                gasLimit: '6721975',
                gasPrice: undefined
            }
        };
    });

    it('Should display the UI to interact with a method', () => {
        const wrapper = helper.mountFn(ContractReadMethod, { propsData: props });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should work when input is any array', async () => {
        jest.spyOn(helper.mocks.server, 'callContractReadMethod')
            .mockResolvedValue([[1, 2]]);

        props.method = {
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
        };

        const wrapper = helper.mountFn(ContractReadMethod, { propsData: props });

        await wrapper.find('input').setValue('[1,2]');
        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);
        
        expect(wrapper.vm.results.length).toEqual(1);
        expect(wrapper.vm.results).toEqual([
            {
                input: {
                    name: '',
                    type: 'uint256[]'
                },
                value: [1, 2]
            }
        ]);
        expect(wrapper.html()).toMatchSnapshot();
    })

    it('Should return the result when interacting with the method', async () => {
        jest.spyOn(helper.mocks.server, 'callContractReadMethod')
            .mockResolvedValue(['true']);

        const wrapper = helper.mountFn(ContractReadMethod, { propsData: props });

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
        jest.spyOn(helper.mocks.server, 'callContractReadMethod')
            .mockResolvedValue(['true']);

        window.ethereum = jest.fn().mockReturnValue({});

        const wrapper = helper.mountFn(ContractReadMethod, {
            propsData: props,
            getters: {
                isPublicExplorer: jest.fn().mockReturnValue(true)
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
        jest.spyOn(helper.mocks.server, 'callContractReadMethod')
            .mockResolvedValue(['1234']);

        props.method = {
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
        };
        const wrapper = helper.mountFn(ContractReadMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.results).toEqual([
            {
                input: {
                    name: '',
                    type: 'uint256'
                },
                value: '1234'
            }
        ]);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle big number results', async () => {
        jest.spyOn(helper.mocks.server, 'callContractReadMethod')
            .mockResolvedValue(['50000000000000000000']);

        props.method = {
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
        };
        const wrapper = helper.mountFn(ContractReadMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.results).toEqual([
            {
                input: {
                    name: '',
                    type: 'uint256'
                },
                value: '50000000000000000000'
            }
        ]);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle multiple results', async () => {
        jest.spyOn(helper.mocks.server, 'callContractReadMethod')
            .mockResolvedValue(['1', '2']);

        props.method = {
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
        };
        const wrapper = helper.mountFn(ContractReadMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.results).toEqual([
            {
                input: {
                    name: '',
                    type: 'uint256'
                },
                value: '1'
            },
            {
                input: {
                    name: '',
                    type: 'uint256'
                },
                value: '2'
            }
        ]);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the error message if one is returned', async () => {
        jest.spyOn(helper.mocks.server, 'callContractReadMethod')
            .mockRejectedValue({ reason: 'Wrong parameters' });

        const wrapper = helper.mountFn(ContractReadMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.error).toEqual('Wrong parameters');
        expect(wrapper.vm.results).toEqual([]);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display a generic error message if the function fails', async () => {
        jest.spyOn(helper.mocks.server, 'callContractReadMethod')
            .mockImplementation(() => { throw 'Error' });

        const wrapper = helper.mountFn(ContractReadMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.error).toEqual('Error while calling the method');
        expect(wrapper.vm.results).toEqual([]);
        expect(wrapper.html()).toMatchSnapshot();
    });    
});
