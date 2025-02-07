import flushPromises from 'flush-promises';
import ERC721TokenTransferModal from '@/components/ERC721TokenTransferModal.vue';
import { vi } from 'vitest';

describe('ERC721TokenTransferModal.vue', () => {

    it('Should not show the wallet connection button if not public explorer', async () => {
        const wrapper = mount(ERC721TokenTransferModal, {
            props: {
                address: '0x123',
                token: {
                    owner: '0xabc',
                    attributes: { name: 'My Token #1' }
                }
            },
            global: {
                stubs: ['Hash-Link', 'WalletConnectorMirror']
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
                stubs: ['Hash-Link', 'WalletConnectorMirror']
            }
        });
        await wrapper.setData({ dialog: true, options: {} });
        await wrapper.find('#recipient').setValue('0x29ea412cc10a9cfc08c2298f382b2fe01e6ca83b');
        await new Promise(process.nextTick);

        await wrapper.find('#transferToken').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the wallet connection button if public explorer', async () => {
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
        vi.mock('@web3-onboard/wagmi', () => ({
            writeContract: vi.fn().mockResolvedValueOnce('0x1234')
        }));

        const wrapper = mount(ERC721TokenTransferModal, {
            props: {
                address: '0x123',
                token: {
                    owner: '0xabc',
                    attributes: { name: 'My Token #1' }
                }
            },
            global: {
                stubs: ['Hash-Link', 'WalletConnectorMirror'],
                plugins: [createTestingPinia({ initialState: {
                    currentWorkspace: { public: true },
                    wallet: { connectedAddress: '0x1bF85ED48fcda98e2c7d08E4F2A8083fb18792AA' }
                }})]
            },
            data: () => ({
                dialog: true
            })
        });

        wrapper.vm.open({
            token: {
                owner: '0x1bF85ED48fcda98e2c7d08E4F2A8083fb18792AA',
                attributes: { name: 'My Token #1' }
            },
            address: '0x123'
        })

        await wrapper.find('#recipient').setValue('0x29ea412cc10a9cfc08c2298f382b2fe01e6ca83b');
        await new Promise(process.nextTick);

        await wrapper.find('#transferToken').trigger('click');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
