import flushPromises from 'flush-promises';

const stubs = ['Hash-Link'];
import GasConsumers from '@/components/GasConsumers.vue';

describe('GasConsumers.vue', () => {
    it('Should show gas consumers', async () => {
        vi.spyOn(server, 'getLatestGasConsumers')
            .mockResolvedValueOnce({ data: [
                { to: null, gasCost: '10000000', percentUsed: 0.01234, gasUsed: 10000000 },
                { to: '0x1235', gasCost: '30000000', percentUsed: 0.04321, gasUsed: 30000000 }
            ]});

        const wrapper = mount(GasConsumers, {
            global: {
                stubs,
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: {
                            chain: { token: 'ETH' }
                        }
                    }
                })],
                provide: {
                    $server: server,
                    $fromWei: fromWei
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
