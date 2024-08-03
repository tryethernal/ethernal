import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises';

import ethereum from '../mocks/ethereum';
import detectEthereumProvider from '@metamask/detect-provider';
jest.mock('@metamask/detect-provider');

import Metamask from '@/components/Metamask.vue';

describe('Metamask.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper({
            currentWorkspace: {
                networkId: 1
            }
        });
        detectEthereumProvider.mockResolvedValue(null);
    });

    it('Should show an explaination message if no metamask', () => {
        window.ethereum = null;
        const wrapper = helper.mountFn(Metamask);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show a "Connect with Metamask" button if no account connected', async () => {
        window.ethereum = ethereum;
        detectEthereumProvider.mockResolvedValueOnce(window.ethereum);

        const wrapper = helper.mountFn(Metamask);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the address when an account is connected', async () => {
        jest.spyOn(ethereum, 'request')
            .mockResolvedValueOnce(['0x1234'])
            .mockResolvedValueOnce('0x1');
        window.ethereum = ethereum;
        detectEthereumProvider.mockResolvedValueOnce(window.ethereum);

        const wrapper = helper.mountFn(Metamask);
        await flushPromises();

        await wrapper.find('#connectMetamask').trigger('click');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show an error is Metamask is not on the expected network', async () => {
        jest.spyOn(ethereum, 'request')
            .mockResolvedValueOnce(['0x1234'])
            .mockResolvedValueOnce('0x2');
        window.ethereum = ethereum;
        detectEthereumProvider.mockResolvedValueOnce(window.ethereum);

        const wrapper = helper.mountFn(Metamask);
        await flushPromises();

        await wrapper.find('#connectMetamask').trigger('click');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should emit the new connection status when connecting Metamask', async () => {
        jest.spyOn(ethereum, 'request')
            .mockResolvedValueOnce(['0x1234'])
            .mockResolvedValueOnce('0x1');
        window.ethereum = ethereum;
        detectEthereumProvider.mockResolvedValueOnce(window.ethereum);

        const wrapper = helper.mountFn(Metamask);
        await flushPromises();

        await wrapper.find('#connectMetamask').trigger('click');
        await flushPromises();

        expect(wrapper.emitted().rpcConnectionStatusChanged.length).toBe(2);
        expect(wrapper.vm.connectedAccount).toEqual('0x1234');
        expect(wrapper.vm.chainId).toEqual('0x1');
    });
});
