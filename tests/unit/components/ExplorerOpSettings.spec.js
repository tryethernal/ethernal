import ExplorerOpSettings from '@/components/ExplorerOpSettings.vue';

describe('ExplorerOpSettings.vue', () => {
    it('Should call getOpConfig and getAvailableL1Parents on mount', async () => {
        vi.spyOn(server, 'getOpConfig')
            .mockResolvedValue({ data: null });
        vi.spyOn(server, 'getAvailableL1Parents')
            .mockResolvedValue({ data: { publicParents: [], customParents: [] } });

        mount(ExplorerOpSettings, {
            props: {
                explorerId: 1
            },
            global: {
                stubs: ['Hash-Link', 'router-link', 'HashLink']
            }
        });

        await new Promise(process.nextTick);

        expect(server.getOpConfig).toHaveBeenCalled();
        expect(server.getAvailableL1Parents).toHaveBeenCalled();
    });

    it('Should display L1 parent chain selection', async () => {
        const mockPublicParents = [
            { networkId: 1, name: 'Ethereum Mainnet' }
        ];

        vi.spyOn(server, 'getOpConfig')
            .mockResolvedValue({ data: null });
        vi.spyOn(server, 'getAvailableL1Parents')
            .mockResolvedValue({ data: { publicParents: mockPublicParents, customParents: [] } });

        const wrapper = mount(ExplorerOpSettings, {
            props: {
                explorerId: 1
            },
            global: {
                stubs: ['Hash-Link', 'router-link', 'HashLink']
            }
        });

        await new Promise(process.nextTick);

        expect(wrapper.text()).toContain('L1 Parent Chain');
    });
});
