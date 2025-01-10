import ethereum from '../mocks/ethereum';
import '../mocks/metamask';

window.ethereum = ethereum;

import ERC721TokenTransferModal from '@/components/ERC721TokenTransferModal.vue';

describe('ERC721TokenTransferModal.vue', () => {

    it('Should not show the metamask button if not public explorer', async () => {
        const wrapper = mount(ERC721TokenTransferModal, {
            props: {
                address: '0x123',
                token: {
                    owner: '0xabc',
                    attributes: { name: 'My Token #1' }
                }
            },
            global: {
                stubs: ['Hash-Link', 'Metamask']
            }
        });
        await wrapper.setData({ dialog: true, options: {} });

        await new Promise(process.nextTick);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should successfully impersonate the account & call the transfer function', async () => {
        vi.spyOn(server, 'impersonateAccount').mockResolvedValue(true);
        vi.spyOn(server, 'transferErc721Token').mockResolvedValue({
            hash: '0xdef',
            wait: vi.fn().mockResolvedValue({ status: 1 })
        });
        const wrapper = mount(ERC721TokenTransferModal, {
            props: {
                address: '0x123',
                token: {
                    owner: '0xabc',
                    attributes: { name: 'My Token #1' }
                }
            },
            global: {
                stubs: ['Hash-Link', 'Metamask']
            }
        });
        await wrapper.setData({ dialog: true, options: {} });
        await wrapper.find('#recipient').setValue('0x29ea412cc10a9cfc08c2298f382b2fe01e6ca83b');
        await new Promise(process.nextTick);

        await wrapper.find('#transferToken').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the Metamask button if public explorer', async () => {
        const wrapper = mount(ERC721TokenTransferModal, {
            props: {
                address: '0x123',
                token: {
                    owner: '0xabc',
                    attributes: { name: 'My Token #1' }
                }
            },
            global: {
                stubs: ['Hash-Link', 'Metamask'],
                plugins: [createTestingPinia({ initialState: { currentWorkspace: { public: true }}})]
            }
        });

        await wrapper.setData({ dialog: true, options: {}, metamaskData: { account: '0x456' }, invalidOwner: false });
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });


    it('Should send a transation with Metamask', async () => {
        const wrapper = mount(ERC721TokenTransferModal, {
            props: {
                address: '0x123',
                token: {
                    owner: '0xabc',
                    attributes: { name: 'My Token #1' }
                }
            },
            global: {
                stubs: ['Hash-Link', 'Metamask'],
                plugins: [createTestingPinia({ initialState: { currentWorkspace: { public: true }}})]
            }
        });

        await wrapper.setData({ dialog: true, options: {}, metamaskData: { account: '0x456', isReady: true }, invalidOwner: false });
        await wrapper.find('#recipient').setValue('0x29ea412cc10a9cfc08c2298f382b2fe01e6ca83b');
        await new Promise(process.nextTick);

        await wrapper.find('#transferToken').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });
});
