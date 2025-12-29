import ExplorerOpSettings from '@/components/ExplorerOpSettings.vue';

describe('ExplorerOpSettings.vue', () => {
    it('Should call getOpConfig and getAvailableOpParents on mount', async () => {
        vi.spyOn(server, 'getOpConfig')
            .mockResolvedValue({ data: null });
        vi.spyOn(server, 'getAvailableOpParents')
            .mockResolvedValue({ data: { availableParents: [] } });

        mount(ExplorerOpSettings, {
            global: {
                stubs: ['Hash-Link', 'router-link', 'HashLink']
            }
        });

        await new Promise(process.nextTick);

        expect(server.getOpConfig).toHaveBeenCalled();
        expect(server.getAvailableOpParents).toHaveBeenCalled();
    });

    it('Should display parent workspaces in dropdown', async () => {
        const mockParents = [
            { id: 1, name: 'Ethereum Mainnet', networkId: 1 },
            { id: 2, name: 'Sepolia', networkId: 11155111 }
        ];

        vi.spyOn(server, 'getOpConfig')
            .mockResolvedValue({ data: null });
        vi.spyOn(server, 'getAvailableOpParents')
            .mockResolvedValue({ data: { availableParents: mockParents } });

        const wrapper = mount(ExplorerOpSettings, {
            global: {
                stubs: ['Hash-Link', 'router-link', 'HashLink']
            }
        });

        await new Promise(process.nextTick);

        expect(wrapper.text()).toContain('L1 Parent Workspace');
    });
});
