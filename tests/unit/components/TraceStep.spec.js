import TraceStep from '@/components/TraceStep.vue';
import TraceStepProp from '../fixtures/TraceStepProp.json';

const stubs = ['Hash-Link', 'Formatted-Sol-Var'];

describe('TraceStep.vue', () => {
    it('Should display the formatted step', async () => {
        const wrapper = mount(TraceStep, {
            props: {
                step: TraceStepProp
            },
            global: {
                stubs,
                plugins: [createTestingPinia({
                    initialState: {
                        explorerStore: {
                            token: 'ETL'
                        }
                    }
                })]
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should decode ERC20 transfer', async () => {
        const erc20Step = {
            depth: 1,
            op: 'CALL',
            input: '0xa9059cbb000000000000000000000000e5a4dad2ea987215460379ab285df87136e83bea0000000000000000000000000000000000000000000000000de0b6b3a7640000', // transfer(address,uint256)
            address: '0x1234567890123456789012345678901234567890'
        };

        const wrapper = mount(TraceStep, {
            props: {
                step: erc20Step
            },
            global: {
                stubs,
                plugins: [createTestingPinia({
                    initialState: {
                        explorerStore: {
                            token: 'ETL'
                        }
                    }
                })]
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should decode ERC721 transferFrom', async () => {
        const erc721Step = {
            depth: 1,
            op: 'CALL',
            input: '0x23b872dd000000000000000000000000e5a4dad2ea987215460379ab285df87136e83bea000000000000000000000000a5a4dad2ea987215460379ab285df87136e83beb0000000000000000000000000000000000000000000000000000000000000001', // transferFrom(address,address,uint256)
            address: '0x1234567890123456789012345678901234567890'
        };

        const wrapper = mount(TraceStep, {
            props: {
                step: erc721Step
            },
            global: {
                stubs,
                plugins: [createTestingPinia({
                    initialState: {
                        explorerStore: {
                            token: 'ETL'
                        }
                    }
                })]
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});
