import BlockOverview from '@/components/BlockOverview.vue';

const stubs = ['HashLink', 'ExpandableText', 'OrbitBlockStatus'];

describe('Block.vue', () => {
    it('Should show block details', async () => {
        const mockBlock = {
            number: 12345678,
            timestamp: '2022-08-07T12:33:37.000Z',
            transactionsCount: 150,
            miner: '0x1234567890123456789012345678901234567890',
            difficulty: 12345,
            raw: {
                totalDifficulty: 987654321,
                size: 45678,
                sha3Uncles: '0xd5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5',
                stateRoot: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
            },
            gasUsed: '21000',
            gasLimit: '30000000',
            baseFeePerGas: '1000000000',
            extraData: '0x486561646572',
            hash: '0x9876543210987654321098765432109876543210987654321098765432109876',
            parentHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
            orbitBatch: {
                batchSequenceNumber: 12345,
                parentChainTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
            },
            orbitStatus: 'confirmed'
        };

        const wrapper = mount(BlockOverview, {
            props: {
                block: mockBlock
            },
            global: {
                stubs,
                plugins: [createTestingPinia({
                    createSpy: vi.fn,
                    initialState: {
                        currentWorkspace: {
                            orbitConfig: {
                                parentChainExplorer: 'https://etherscan.io'
                            },
                            chain: {
                                token: 'ETH'
                            }
                        }
                    }
                })]
            }
        });

        await flushPromises();

        // Test UI rendering with snapshot
        expect(wrapper.html()).toMatchSnapshot();

        // Test interaction (this should remain as a specific test)
        const txLink = wrapper.find('a[href="#"]');
        await txLink.trigger('click');
        expect(wrapper.emitted()['change-tab'][0]).toEqual(['transactions']);
    });

    it('Should not show the rollup status when the workspace has no Orbit config', async () => {
        const wrapper = mount(BlockOverview, {
            props: {
                block: {
                    number: 26930943,
                    timestamp: '2022-08-07T12:33:37.000Z',
                    transactionsCount: 3,
                    gasUsed: '21000',
                    gasLimit: '30000000',
                    raw: {},
                    orbitStatus: 'processed_on_rollup'
                }
            },
            global: {
                stubs,
                plugins: [createTestingPinia({
                    createSpy: vi.fn,
                    initialState: {
                        currentWorkspace: {
                            orbitConfig: null,
                            chain: { token: 'ETH' }
                        }
                    }
                })]
            }
        });

        await flushPromises();

        expect(wrapper.findComponent({ name: 'OrbitBlockStatus' }).exists()).toBe(false);
        expect(wrapper.html()).not.toContain('orbit-block-status-stub');
    });

    it('Should show block details without orbit data', async () => {
        const mockBlock = {
            number: 12345678,
            timestamp: '2022-08-07T12:33:37.000Z',
            transactionsCount: 150,
            miner: '0x1234567890123456789012345678901234567890',
            difficulty: 12345,
            raw: {
                totalDifficulty: 987654321,
                size: 45678,
                sha3Uncles: '0xd5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5',
                stateRoot: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
            },
            gasUsed: '21000',
            gasLimit: '30000000',
            baseFeePerGas: '1000000000',
            extraData: '0x486561646572',
            hash: '0x9876543210987654321098765432109876543210987654321098765432109876',
            parentHash: '0x1234567890123456789012345678901234567890123456789012345678901234'
        };

        const wrapper = mount(BlockOverview, {
            props: {
                block: mockBlock
            },
            global: {
                stubs,
                plugins: [createTestingPinia({
                    createSpy: vi.fn,
                    initialState: {
                        currentWorkspace: {
                            chain: {
                                token: 'ETH'
                            }
                        },
                        explorer: {}
                    }
                })]
            }
        });

        await flushPromises();

        // Test UI rendering with snapshot
        expect(wrapper.html()).toMatchSnapshot();
    });
});
