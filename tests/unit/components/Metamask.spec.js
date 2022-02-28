import MockHelper from '../MockHelper';

import ethereum from '../mocks/ethereum';
import detectEthereumProvider from '@metamask/detect-provider';
jest.mock('@metamask/detect-provider');

import Metamask from '@/components/Metamask.vue';

describe('Metamask.vue', () => {
    let helper, db;

    beforeEach(async () => {
        helper = new MockHelper({
            publicExplorer: {
                chainId: 1
            } 
        });
        helper.getters.isPublicExplorer.mockImplementation(() => true);
        detectEthereumProvider.mockImplementation(function() {
            return new Promise((resolve) => resolve(window.ethereum));
        });
    });

    it('Should show an explaination message if no metamask', (done) => {
        window.ethereum = null;
        const wrapper = helper.mountFn(Metamask);
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should show a "Connect with Metamask" button if no account connected', (done) => {
        ethereum.isConnected.mockImplementation(() => false);
        window.ethereum = ethereum;
        
        const wrapper = helper.mountFn(Metamask);
        
        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1000);
    });

    it('Should show the address when an account is connected', (done) => {
        ethereum.isConnected.mockImplementation(() => true);
        window.ethereum = ethereum;

        const wrapper = helper.mountFn(Metamask);
        
        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1000);
    });

    it('Should show an error is Metamask is not on the expected network', (done) => {
        ethereum.isConnected.mockImplementation(() => true);
        ethereum.eth_chainId.mockImplementation(() => '0x2');
        window.ethereum = ethereum;

        const wrapper = helper.mountFn(Metamask);
        
        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1000);
    });

    it('Should emit the new connection status when connecting Metamask', (done) => {
        ethereum.isConnected.mockImplementation(() => false);
        window.ethereum = ethereum;

        const wrapper = helper.mountFn(Metamask);
        
        setTimeout(async () => {
            await wrapper.find('#connectMetamask').trigger('click');
            await wrapper.vm.$nextTick();
            expect(wrapper.emitted().rpcConnectionStatusChanged.length).toBe(2);
            expect(wrapper.vm.connectedAccount).toEqual('0x1234');
            expect(wrapper.vm.chainId).toEqual('0x1');
            done();
        }, 1000);
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});
