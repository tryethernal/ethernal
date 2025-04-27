import TransactionsList from '@/components/TransactionsList.vue';

describe('TransactionsList.vue', () => {
    it('Should display the list', async () => {
        const transaction1 = {
            hash: '0x060034486a819816df57d01eefccbe161d7019f9f3c235e18af07468fb194ef0',
            timestamp: '2022-05-06T17:11:26.000Z',
            from: '0x0',
            to: 'Ox1',
            gas: 0,
            gasPrice: 0,
            blockNumber: 1,
            receipt: {
                gasUsed: 0,
                status: 1
            },
            value: '0',
            data: '0xa9059cbb000000000000000000000000c00e94cb662c3520282e6f5717214004a7f268880000000000000000000000000000000000000000000000000000000000000001'
        };

        const transaction2 = {
            hash: '0x1234',
            timestamp: '2022-05-06T17:11:26.000Z',
            from: '0x0',
            to: 'Ox1',
            gas: 0,
            gasPrice: 0,
            blockNumber: 1,
            value: '0',
            state: 'syncing'
        };

        vi.spyOn(server, 'getTransactions')
            .mockResolvedValue({
                data: {
                    items: [transaction1, transaction2],
                    total: 2
                }
            }); 

        const wrapper = mount(TransactionsList, {
            props: {
                transactions: [transaction1, transaction2],
                currentAddress: '0x123',
                loading: false,
                withCount: true
            },
            global: {
                stubs: ['Hash-Link'],
                provide: {
                    $server: server,
                    $pusher: pusher
                }
            }
        });
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display a message if no transactions', async () => {
        vi.spyOn(server, 'getTransactions')
            .mockResolvedValue({
                data: {
                    items: [],
                    total: 0
                }
            });

        const wrapper = mount(TransactionsList, {
            props: {
                withCount: true
            },
            global: {
                provide: {
                    $server: server,
                    $pusher: pusher
                }
            }
        });
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });
});
