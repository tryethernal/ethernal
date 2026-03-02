import OpBatches from '@/components/OpBatches.vue';

describe('OpBatches.vue', () => {
    it('Should call getOpBatches on mount', async () => {
        vi.spyOn(server, 'getOpBatches')
            .mockResolvedValue({
                data: {
                    items: [],
                    total: 0
                }
            });

        mount(OpBatches, {
            global: {
                stubs: ['Hash-Link', 'router-link', 'HashLink']
            }
        });

        await new Promise(process.nextTick);

        expect(server.getOpBatches).toHaveBeenCalled();
    });
});
