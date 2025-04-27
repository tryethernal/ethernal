import TransactionEventLogDetails from '@/components/TransactionEventLogDetails.vue';

const stubs = ['Hash-Link', 'Formatted-Sol-Var', 'TransactionEventRawInfo'];

describe('TransactionEventLogDetails.vue', () => {
    describe('When log is parsed', () => {
        it('Should display event with no arguments', async () => {
            const wrapper = mount(TransactionEventLogDetails, {
                props: {
                    parsedLog: {
                        name: 'TestEvent',
                        args: [],
                        eventFragment: {
                            inputs: []
                        }
                    },
                    log: {},
                    contract: {
                        name: 'TestContract'
                    }
                },
                global: {
                    stubs
                }
            });

            expect(wrapper.html()).toMatchSnapshot();
        });

        it('Should display event with arguments in short mode', async () => {
            const wrapper = mount(TransactionEventLogDetails, {
                props: {
                    parsedLog: {
                        name: 'TestEvent',
                        args: ['arg1', 'arg2', 'arg3', 'arg4'],
                        eventFragment: {
                            inputs: [
                                { name: 'param1' },
                                { name: 'param2' },
                                { name: 'param3' },
                                { name: 'param4' }
                            ]
                        }
                    },
                    log: {
                        address: '0x123'
                    },
                    contract: {
                        name: 'TestContract'
                    },
                    short: true,
                    maxShortLines: 2
                },
                global: {
                    stubs
                }
            });

            expect(wrapper.html()).toMatchSnapshot();
        });

        it('Should expand to show more arguments when clicking expand button', async () => {
            const wrapper = mount(TransactionEventLogDetails, {
                props: {
                    parsedLog: {
                        name: 'TestEvent',
                        args: ['arg1', 'arg2', 'arg3', 'arg4'],
                        eventFragment: {
                            inputs: [
                                { name: 'param1' },
                                { name: 'param2' },
                                { name: 'param3' },
                                { name: 'param4' }
                            ]
                        }
                    },
                    log: {
                        address: '0x123'
                    },
                    contract: {
                        name: 'TestContract'
                    },
                    short: true,
                    maxShortLines: 2
                },
                global: {
                    stubs
                }
            });

            await wrapper.find('button').trigger('click');
            expect(wrapper.html()).toMatchSnapshot();
        });

        it('Should display event in tooltip mode', async () => {
            const wrapper = mount(TransactionEventLogDetails, {
                props: {
                    parsedLog: {
                        name: 'TestEvent',
                        args: ['arg1', 'arg2'],
                        eventFragment: {
                            inputs: [
                                { name: 'param1' },
                                { name: 'param2' }
                            ]
                        }
                    },
                    log: {
                        address: '0x123'
                    },
                    isTooltip: true,
                    contract: {
                        name: 'TestContract'
                    }
                },
                global: {
                    stubs
                }
            });

            expect(wrapper.html()).toMatchSnapshot();
        });
    });

    describe('When log is not parsed', () => {
        it('Should display raw event info', async () => {
            const wrapper = mount(TransactionEventLogDetails, {
                props: {
                    parsedLog: null,
                    log: {
                        address: '0x123',
                        topics: ['topic1', 'topic2'],
                        data: '0xdata'
                    },
                    contract: {
                        name: 'TestContract'
                    }
                },
                global: {
                    stubs
                }
            });

            expect(wrapper.html()).toMatchSnapshot();
        });
    });
}); 