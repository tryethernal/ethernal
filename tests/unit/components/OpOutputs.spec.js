import OpOutputs from '@/components/OpOutputs.vue';

describe('OpOutputs.vue', () => {
    it('Should call getOpOutputs on mount', async () => {
        vi.spyOn(server, 'getOpOutputs')
            .mockResolvedValue({
                data: {
                    items: [],
                    total: 0
                }
            });

        mount(OpOutputs, {
            global: {
                stubs: ['Hash-Link', 'router-link', 'HashLink']
            }
        });

        await new Promise(process.nextTick);

        expect(server.getOpOutputs).toHaveBeenCalled();
    });
});
