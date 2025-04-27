import TraceStepsTable from '@/components/TraceStepsTable.vue';
import { VDataTableServer } from 'vuetify/components';

const stubs = ['Hash-Link'];

describe('TraceStepsTable.vue', () => {
    const mockItems = [{
        id: '1',
        transaction: {
            hash: '0x123',
            timestamp: '2024-03-21T10:00:00Z'
        },
        method: {
            name: 'transfer',
            label: 'Transfer(address,uint256)',
            sighash: '0xa9059cbb'
        },
        from: {
            address: '0xabc',
            contract: null
        },
        to: {
            address: '0xdef',
            contract: {
                name: 'TestToken'
            }
        },
        value: '1000000000000000000',
        op: 'CALL'
    }];

    const defaultProps = {
        loading: false,
        items: mockItems,
        totalItems: 1,
        sortBy: [{ key: 'timestamp', order: 'desc' }]
    };

    it('Should render the table with data', async () => {
        const wrapper = mount(TraceStepsTable, {
            props: defaultProps,
            global: {
                stubs,
                provide: {
                    $dt: {
                        shortDate: vi.fn().mockReturnValue('Mar 21, 2024'),
                        fromNow: vi.fn().mockReturnValue('2 hours ago')
                    },
                    $fromWei: vi.fn().mockReturnValue('1.0')
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should render the table in dense mode', async () => {
        const wrapper = mount(TraceStepsTable, {
            props: {
                ...defaultProps,
                dense: true
            },
            global: {
                stubs,
                provide: {
                    $dt: {
                        shortDate: vi.fn().mockReturnValue('Mar 21, 2024'),
                        fromNow: vi.fn().mockReturnValue('2 hours ago')
                    },
                    $fromWei: vi.fn().mockReturnValue('1.0')
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should render the table with highlighted address', async () => {
        const wrapper = mount(TraceStepsTable, {
            props: {
                ...defaultProps,
                highlightAddress: '0xabc'
            },
            global: {
                stubs,
                provide: {
                    $dt: {
                        shortDate: vi.fn().mockReturnValue('Mar 21, 2024'),
                        fromNow: vi.fn().mockReturnValue('2 hours ago')
                    },
                    $fromWei: vi.fn().mockReturnValue('1.0')
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should emit update:options when table options change', async () => {
        const wrapper = mount(TraceStepsTable, {
            props: defaultProps,
            global: {
                stubs,
                provide: {
                    $dt: {
                        shortDate: vi.fn().mockReturnValue('Mar 21, 2024'),
                        fromNow: vi.fn().mockReturnValue('2 hours ago')
                    },
                    $fromWei: vi.fn().mockReturnValue('1.0')
                }
            }
        });

        const table = wrapper.findComponent(VDataTableServer);
        const newOptions = {
            page: 1,
            itemsPerPage: 10,
            sortBy: [{ key: 'timestamp', order: 'desc' }],
            groupBy: [],
            search: undefined
        };
        await table.vm.$emit('update:options', newOptions);

        expect(wrapper.emitted('update:options')).toBeTruthy();
        expect(wrapper.emitted('update:options')[0]).toEqual([newOptions]);
    });
}); 