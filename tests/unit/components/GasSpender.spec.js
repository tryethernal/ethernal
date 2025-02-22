import flushPromises from 'flush-promises';

const stubs = ['Hash-Link'];
import GasSpender from '@/components/GasSpender.vue';

describe('GasSpender.vue', () => {
    it('Should show gas spenders', async () => {
        vi.spyOn(server, 'getLatestGasSpenders')
            .mockResolvedValueOnce({ data: [
                { from: '0x1234', gasCost: '10000000', percentUsed: 0.01234, gasUsed: 10000000 },
                { from: '0x1235', gasCost: '30000000', percentUsed: 0.04321, gasUsed: 30000000 }
            ]});

        const wrapper = mount(GasSpender, {
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
