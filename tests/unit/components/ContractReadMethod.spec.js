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
            options: {
                from: '0x0',
                gasLimit: '6721975',
                gasPrice: undefined
            }
        };
    });

    it('Should display the UI to interact with a method', (done) => {
        const wrapper = helper.mountFn(ContractReadMethod, { propsData: props });

        expect(wrapper.html()).toMatchSnapshot();

        done();
    });

    it('Should work when input is any array', async (done) => {
        helper.mocks.server.callContractReadMethod = () => {
            return new Promise(resolve => resolve([1, 2]));
        };
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
        await wrapper.vm.$nextTick();
        
        expect(wrapper.vm.result).toBe('1 | 2');
        expect(wrapper.html()).toMatchSnapshot();
        done();
    })

    it('Should return the result when interacting with the method', async (done) => {
        const wrapper = helper.mountFn(ContractReadMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.result).toBe('true');
        expect(wrapper.html()).toMatchSnapshot();

        done();
    });

    it('Should handle big number results', async (done) => {
        helper.mocks.server.callContractReadMethod = () => {
            return new Promise(resolve => resolve(['50000000000000000000']));
        };
        const wrapper = helper.mountFn(ContractReadMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.result).toBe('50000000000000000000');
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should handle multiple results', async (done) => {
        helper.mocks.server.callContractReadMethod = () => {
            return new Promise(resolve => resolve(['1', '2']));
        };
        const wrapper = helper.mountFn(ContractReadMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.result).toBe('1 | 2');
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display the error message if one is returned', async (done) => {
        helper.mocks.server.callContractReadMethod = () => {
            return new Promise((_resolve, reject) => reject({ reason: 'Wrong parameters' }));
        };
        const wrapper = helper.mountFn(ContractReadMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.result).toBe('Wrong parameters');
        expect(wrapper.html()).toMatchSnapshot();
        done();        
    });

    it('Should display a generic error message if the function fails', async (done) => {
        helper.mocks.server.callContractReadMethod = () => {
            throw 'Error';
        };
        const wrapper = helper.mountFn(ContractReadMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.result).toBe('Error while calling the method');
        expect(wrapper.html()).toMatchSnapshot();
        done();        
    });    

    afterEach(async () => {
        await helper.clearFirebase();
    });
});
