import VerifiedContracts from '@/components/VerifiedContracts.vue';

const stubs = ['Hash-Link', 'Stat-Number'];

describe('VerifiedContracts.vue', () => {
    it('Should show verified contracts with stats and table', async () => {
        vi.spyOn(server, 'getWorkspaceContractStats').mockResolvedValueOnce({
            data: {
                stats: {
                    total_contracts: 100,
                    contracts_last_24_hours: 5,
                    verified_contracts: 50,
                    verified_contracts_last_24_hours: 2
                }
            }
        });

        vi.spyOn(server, 'getWorkspaceVerifiedContracts').mockResolvedValueOnce({
            data: {
                items: [{
                    address: '0x123',
                    name: 'TestContract',
                    verification: {
                        compilerVersion: 'v0.8.0+commit.123',
                        runs: 200,
                        constructorArguments: '0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000548656c6c6f000000000000000000000000000000000000000000000000000000',
                        createdAt: '2024-03-20T10:00:00Z'
                    },
                    transactionCount: 10,
                    patterns: ['ERC20'],
                    abi: JSON.stringify([{
                        type: 'constructor',
                        inputs: [{
                            type: 'string',
                            name: 'name'
                        }]
                    }])
                }]
            }
        });

        const wrapper = mount(VerifiedContracts, {
            global: {
                stubs
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle loading states', async () => {
        vi.spyOn(server, 'getWorkspaceContractStats').mockResolvedValueOnce(new Promise(() => {}));
        vi.spyOn(server, 'getWorkspaceVerifiedContracts').mockResolvedValueOnce(new Promise(() => {}));

        const wrapper = mount(VerifiedContracts, {
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle pagination updates', async () => {
        const mockGetContracts = vi.spyOn(server, 'getWorkspaceVerifiedContracts')
            .mockResolvedValueOnce({
                data: {
                    items: [{
                        address: '0x123',
                        name: 'TestContract',
                        verification: {
                            compilerVersion: 'v0.8.0+commit.123',
                            runs: 200,
                            constructorArguments: '0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000548656c6c6f000000000000000000000000000000000000000000000000000000',
                            createdAt: '2024-03-20T10:00:00Z'
                        },
                        transactionCount: 10,
                        patterns: ['ERC20'],
                        abi: JSON.stringify([{
                            type: 'constructor',
                            inputs: [{
                                type: 'string',
                                name: 'name'
                            }]
                        }])
                    }]
                }
            })
            .mockResolvedValueOnce({
                data: {
                    items: [{
                        address: '0x456',
                        name: 'TestContract2',
                        verification: {
                            compilerVersion: 'v0.8.0+commit.123',
                            runs: 200,
                            constructorArguments: '0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000548656c6c6f000000000000000000000000000000000000000000000000000000',
                            createdAt: '2024-03-20T10:00:00Z'
                        },
                        transactionCount: 5,
                        patterns: ['ERC721'],
                        abi: JSON.stringify([{
                            type: 'constructor',
                            inputs: [{
                                type: 'string',
                                name: 'name'
                            }]
                        }])
                    }]
                }
            });

        vi.spyOn(server, 'getWorkspaceContractStats').mockResolvedValueOnce({
            data: {
                stats: {
                    total_contracts: 100,
                    contracts_last_24_hours: 5,
                    verified_contracts: 50,
                    verified_contracts_last_24_hours: 2
                }
            }
        });

        const wrapper = mount(VerifiedContracts, {
            global: {
                stubs
            }
        });

        await flushPromises();

        await wrapper.findComponent({ name: 'v-data-table-server' }).vm.$emit('update:options', {
            page: 2,
            itemsPerPage: 25
        });

        await flushPromises();

        expect(mockGetContracts).toHaveBeenCalledWith({
            page: 2,
            itemsPerPage: 25
        });
        expect(wrapper.html()).toMatchSnapshot();
    });
});
