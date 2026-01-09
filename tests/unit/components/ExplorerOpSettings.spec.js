import ExplorerOpSettings from '@/components/ExplorerOpSettings.vue';

describe('ExplorerOpSettings.vue', () => {
    it('Should call getOpConfig and getAvailableOpParents on mount', async () => {
        vi.spyOn(server, 'getOpConfig')
            .mockResolvedValue({ data: null });
        vi.spyOn(server, 'getAvailableOpParents')
            .mockResolvedValue({ data: { availableNetworks: [] } });

        mount(ExplorerOpSettings, {
            global: {
                stubs: ['Hash-Link', 'router-link', 'HashLink']
            }
        });

        await new Promise(process.nextTick);

        expect(server.getOpConfig).toHaveBeenCalled();
        expect(server.getAvailableOpParents).toHaveBeenCalled();
    });

    it('Should display network selection dropdown', async () => {
        const mockNetworks = [
            { networkId: 1, name: 'Ethereum Mainnet', explorerUrl: 'https://etherscan.io' }
        ];

        vi.spyOn(server, 'getOpConfig')
            .mockResolvedValue({ data: null });
        vi.spyOn(server, 'getAvailableOpParents')
            .mockResolvedValue({ data: { availableNetworks: mockNetworks } });

        const wrapper = mount(ExplorerOpSettings, {
            global: {
                stubs: ['Hash-Link', 'router-link', 'HashLink']
            }
        });

        await new Promise(process.nextTick);

        expect(wrapper.text()).toContain('L1 Parent Network');
    });
});
