import TransactionEventRawInfo from '@/components/TransactionEventRawInfo.vue';

const stubs = ['Hash-Link'];

describe('TransactionEventRawInfo.vue', () => {
    const defaultProps = {
        address: '0x123',
        topics: ['topic1', 'topic2'],
        data: '0xabcdef',
        showEmitter: true,
        isTooltip: false,
        contract: { name: 'Test Contract' }
    };

    it('Should render with all props', async () => {
        const wrapper = mount(TransactionEventRawInfo, {
            props: defaultProps,
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should render without emitter', async () => {
        const wrapper = mount(TransactionEventRawInfo, {
            props: {
                ...defaultProps,
                showEmitter: false
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should render as tooltip', async () => {
        const wrapper = mount(TransactionEventRawInfo, {
            props: {
                ...defaultProps,
                isTooltip: true
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should render without contract', async () => {
        const wrapper = mount(TransactionEventRawInfo, {
            props: {
                ...defaultProps,
                contract: null
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
}); 