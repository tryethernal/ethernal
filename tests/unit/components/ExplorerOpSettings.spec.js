import ExplorerOpSettings from '@/components/ExplorerOpSettings.vue';

describe('ExplorerOpSettings.vue', () => {
    it('Should call getOpConfig on mount', async () => {
        vi.spyOn(server, 'getOpConfig')
            .mockResolvedValue({ data: null });

        mount(ExplorerOpSettings, {
            global: {
                stubs: ['Hash-Link', 'router-link', 'HashLink']
            }
        });

        await new Promise(process.nextTick);

        expect(server.getOpConfig).toHaveBeenCalled();
    });
});
