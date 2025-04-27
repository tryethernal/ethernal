import ContractLogs from '@/components/ContractLogs.vue';
import { VDataTableServer } from 'vuetify/components';
import server from '../mocks/server';

const stubs = {
    'Hash-Link': true,
    'Transaction-Event': {
        template: `
            <div data-v-1a031228="" class="my-3 text-medium-emphasis">
                <div data-v-1a031228="">
                    <div v-if="log.log.raw">{{ log.log.raw }}</div>
                </div>
            </div>
        `,
        props: ['log', 'short', 'self']
    }
};

const mockLogs = {
    items: [
        {
            log: { 
                name: 'TestEvent',
                address: '0x123',
                raw: '0x123'
            },
            receipt: {
                transactionHash: '0x123',
                blockNumber: 1,
                transaction: {
                    timestamp: '2024-03-20T10:00:00Z'
                }
            }
        }
    ]
};

describe('ContractLogs.vue', () => {
    const mockOnNewContractLog = vi.fn();
    const mockShortDate = vi.fn().mockReturnValue('Mar 20, 2024');

    beforeEach(() => {
        vi.spyOn(server, 'getContractLogs').mockReset();
        server.getContractLogs.mockResolvedValue({ data: mockLogs });
        mockOnNewContractLog.mockReturnValue(() => {});
    });

    const mountOptions = {
        props: {
            address: '0x123'
        },
        global: {
            stubs,
            provide: {
                $pusher: {
                    onNewContractLog: mockOnNewContractLog
                },
                $dt: {
                    shortDate: mockShortDate
                }
            }
        }
    };

    it('Should show the contract logs table', async () => {
        const wrapper = mount(ContractLogs, mountOptions);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should fetch logs when address prop changes', async () => {
        const wrapper = mount(ContractLogs, mountOptions);
        await flushPromises();

        // Emit initial options to set up sorting
        await wrapper.findComponent(VDataTableServer).vm.$emit('update:options', {
            page: 1,
            itemsPerPage: 10,
            sortBy: [{ key: 'blockNumber', order: 'desc' }]
        });
        await flushPromises();

        // Clear previous calls
        vi.spyOn(server, 'getContractLogs').mockReset();
        vi.spyOn(server, 'getContractLogs').mockResolvedValue({ data: mockLogs });

        await wrapper.setProps({ address: '0x456' });
        await flushPromises();

        // Re-emit options to trigger the watcher with the new address
        await wrapper.findComponent(VDataTableServer).vm.$emit('update:options', {
            page: 1,
            itemsPerPage: 10,
            sortBy: [{ key: 'blockNumber', order: 'desc' }]
        });
        await flushPromises();

        // Second call should be with same sort options but new address
        expect(server.getContractLogs).toHaveBeenCalledWith('0x456', {
            page: 1,
            itemsPerPage: 10,
            orderBy: 'blockNumber',
            order: 'desc'
        });
        expect(server.getContractLogs).toHaveBeenCalledTimes(1);
    });

    it('Should setup pusher subscription on mount', async () => {
        await flushPromises();

        expect(mockOnNewContractLog).toHaveBeenCalledWith(
            expect.any(Function),
            '0x123'
        );
    });

    it('Should update logs when table options change', async () => {
        const wrapper = mount(ContractLogs, mountOptions);
        await flushPromises();

        // Clear previous calls
        vi.spyOn(server, 'getContractLogs').mockReset();
        vi.spyOn(server, 'getContractLogs').mockResolvedValue({ data: mockLogs });

        await wrapper.findComponent(VDataTableServer).vm.$emit('update:options', {
            page: 2,
            itemsPerPage: 25,
            sortBy: [{ key: 'blockNumber', order: 'asc' }]
        });
        await flushPromises();

        expect(server.getContractLogs).toHaveBeenCalledWith('0x123', {
            page: 2,
            itemsPerPage: 25,
            orderBy: 'blockNumber',
            order: 'asc'
        });
    });
}); 