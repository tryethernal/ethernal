import '../mocks/ethers';
import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises';

jest.mock('@metamask/detect-provider')
import detectEthereumProvider from '@metamask/detect-provider';

import Metamask from '@/components/Metamask.vue';

describe('Metamask.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper({
            currentWorkspace: {
                networkId: 1
            }
        });
    });

    it('Should show an explaination message if no metamask', () => {
        window.ethereum = null;
        detectEthereumProvider.mockResolvedValueOnce({});
        const wrapper = helper.mountFn(Metamask);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show a "Connect with Metamask" button if no account connected', async () => {
        const ethereum = {
            request: jest.fn().mockResolvedValueOnce([]),
            on: jest.fn().mockResolvedValueOnce([])
                .mockResolvedValue(null)
        };
        window.ethereum = ethereum;
        detectEthereumProvider.mockResolvedValueOnce(window.ethereum);

        const wrapper = helper.mountFn(Metamask);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the address when an account is connected', async () => {
        const ethereum = {
            request: jest.fn().mockResolvedValueOnce(['account'])
                .mockResolvedValueOnce(['0x1234'])
                .mockResolvedValueOnce('0x1'),
            on: jest.fn().mockResolvedValueOnce([])
                .mockResolvedValue(null)
        };
        window.ethereum = ethereum;
        detectEthereumProvider.mockResolvedValueOnce(window.ethereum);

        const wrapper = helper.mountFn(Metamask);
        await flushPromises();
        expect(wrapper.emitted().rpcConnectionStatusChanged.length).toBe(2);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show an error is Metamask is not on the expected network', async () => {
        const ethereum = {
            request: jest.fn().mockResolvedValueOnce(['account'])
                .mockResolvedValueOnce(['0x1234'])
                .mockResolvedValueOnce('0x2'),
            on: jest.fn().mockResolvedValueOnce([])
                .mockResolvedValue(null)
        };
        window.ethereum = ethereum;
        detectEthereumProvider.mockResolvedValueOnce(window.ethereum);

        const wrapper = helper.mountFn(Metamask);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
