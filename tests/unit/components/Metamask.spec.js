import '../mocks/ethers';
import flushPromises from 'flush-promises';

vi.mock('@metamask/detect-provider')
import detectEthereumProvider from '@metamask/detect-provider';

import Metamask from '@/components/Metamask.vue';

describe('Metamask.vue', () => {
    it('Should show an explaination message if no metamask', () => {
        window.ethereum = null;
        detectEthereumProvider.mockResolvedValueOnce({});
        const wrapper = mount(Metamask, {
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: { networkId: 2 }
                    }
                })]
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show a "Connect with Metamask" button if no account connected', async () => {
        const ethereum = {
            request: vi.fn().mockResolvedValueOnce([]),
            on: vi.fn().mockResolvedValueOnce([])
                .mockResolvedValue(null)
        };
        window.ethereum = ethereum;
        detectEthereumProvider.mockResolvedValueOnce(window.ethereum);

        const wrapper = mount(Metamask, {
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: { networkId: 2 }
                    }
                })]
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the address when an account is connected', async () => {
        const ethereum = {
            request: vi.fn().mockResolvedValueOnce(['account'])
                .mockResolvedValueOnce(['0x1234'])
                .mockResolvedValueOnce('0x1'),
            on: vi.fn().mockResolvedValueOnce([])
                .mockResolvedValue(null)
        };
        window.ethereum = ethereum;
        detectEthereumProvider.mockResolvedValueOnce(window.ethereum);

        const wrapper = mount(Metamask, {
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: { networkId: 1 }
                    }
                })]
            }
        });
        await flushPromises();
        expect(wrapper.emitted().rpcConnectionStatusChanged.length).toBe(2);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show an error is Metamask is not on the expected network', async () => {
        const ethereum = {
            request: vi.fn().mockResolvedValueOnce(['account'])
                .mockResolvedValueOnce(['0x1234'])
                .mockResolvedValueOnce('0x2'),
            on: vi.fn().mockResolvedValueOnce([])
                .mockResolvedValue(null)
        };
        window.ethereum = ethereum;
        detectEthereumProvider.mockResolvedValueOnce(window.ethereum);

        const wrapper = mount(Metamask, {
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: { networkId: 1 }
                    }
                })]
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
