import flushPromises from 'flush-promises';
import TransactionEvent from '@/components/TransactionEvent.vue';
import LogProp from '../fixtures/LogProp.json';
import ABIProp from '../fixtures/ABIProp.json';
const stubs = ['LogDetails', 'TransactionEventRawInfo'];

describe('TransactionEvent.vue', () => {
    it('Should display in raw mode if no topics', async () => {
        const wrapper = mount(TransactionEvent, {
            props: {
                log: {
                    ...LogProp,
                    topics: null
                }
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display short version', async () => {
        const wrapper = mount(TransactionEvent, {
            props: {
                log: LogProp,
                short: true
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display transaction event', async () => {
        vi.mock('@/lib/abi', () => ({
            decodeLog: vi.fn().mockReturnValueOnce({ name: 'Transfer' }),
            findAbiForEvent: vi.fn().mockReturnValue(null)
        }));
        vi.spyOn(server, 'getContract')
            .mockResolvedValueOnce({ data: { address: '0x123', abi: ABIProp }});

        const wrapper = mount(TransactionEvent, {
            props: {
                log: LogProp
            },
            global: {
                stubs
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
