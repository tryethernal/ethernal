import OrbitBatchDetail from '@/components/OrbitBatchDetail.vue';
import { useRouter } from 'vue-router';

vi.mock('vue-router', () => ({
    useRouter: vi.fn()
}));

const stubs = [
    'BaseChipGroup',
    'OrbitBatchOverview', 
    'OrbitBatchBlocks',
    'OrbitBatchTransactions'
];

const mockRouter = {
    currentRoute: {
        value: {
            fullPath: '/batch/123'
        }
    },
    replace: vi.fn(),
    afterEach: vi.fn()
};

describe('OrbitBatchDetail.vue', () => {
    beforeEach(() => {
        // Reset window.location.hash before each test
        window.location.hash = '';
        vi.clearAllMocks();
        useRouter.mockReturnValue(mockRouter);
    });

    it('Should show loading state', async () => {
        vi.spyOn(server, 'getOrbitBatchDetail').mockResolvedValueOnce({ data: {} });
        
        const wrapper = mount(OrbitBatchDetail, {
            props: {
                batchNumber: '123'
            },
            global: {
                stubs,
                mocks: {
                    $route: {
                        params: {
                            batchNumber: '123'
                        }
                    }
                }
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show batch data with overview tab selected by default', async () => {
        const mockBatch = {
            batchSequenceNumber: '123',
            timestamp: '2024-01-01T00:00:00Z',
            blockCount: 5,
            transactionCount: 10
        };

        vi.spyOn(server, 'getOrbitBatchDetail').mockResolvedValueOnce({ data: mockBatch });
        
        const wrapper = mount(OrbitBatchDetail, {
            props: {
                batchNumber: '123'
            },
            global: {
                stubs,
                mocks: {
                    $route: {
                        params: {
                            batchNumber: '123'
                        }
                    }
                }
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show blocks tab when hash is #blocks', async () => {
        window.location.hash = '#blocks';
        
        const mockBatch = {
            batchSequenceNumber: '123',
            timestamp: '2024-01-01T00:00:00Z',
            blockCount: 5,
            transactionCount: 10
        };

        vi.spyOn(server, 'getOrbitBatchDetail').mockResolvedValueOnce({ data: mockBatch });
        
        const wrapper = mount(OrbitBatchDetail, {
            props: {
                batchNumber: '123'
            },
            global: {
                stubs,
                mocks: {
                    $route: {
                        params: {
                            batchNumber: '123'
                        }
                    }
                }
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show transactions tab when hash is #transactions', async () => {
        window.location.hash = '#transactions';
        
        const mockBatch = {
            batchSequenceNumber: '123',
            timestamp: '2024-01-01T00:00:00Z',
            blockCount: 5,
            transactionCount: 10
        };

        vi.spyOn(server, 'getOrbitBatchDetail').mockResolvedValueOnce({ data: mockBatch });
        
        const wrapper = mount(OrbitBatchDetail, {
            props: {
                batchNumber: '123'
            },
            global: {
                stubs,
                mocks: {
                    $route: {
                        params: {
                            batchNumber: '123'
                        }
                    }
                }
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show error state when batch is not found', async () => {
        vi.spyOn(server, 'getOrbitBatchDetail').mockRejectedValueOnce(new Error('Batch not found'));
        
        const wrapper = mount(OrbitBatchDetail, {
            props: {
                batchNumber: '999'
            },
            global: {
                stubs,
                mocks: {
                    $route: {
                        params: {
                            batchNumber: '999'
                        }
                    }
                }
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should reload batch when batchNumber prop changes', async () => {
        const mockBatch1 = {
            batchSequenceNumber: '123',
            timestamp: '2024-01-01T00:00:00Z',
            blockCount: 5,
            transactionCount: 10
        };

        const mockBatch2 = {
            batchSequenceNumber: '124',
            timestamp: '2024-01-02T00:00:00Z',
            blockCount: 3,
            transactionCount: 7
        };

        vi.spyOn(server, 'getOrbitBatchDetail')
            .mockResolvedValueOnce({ data: mockBatch1 })
            .mockResolvedValueOnce({ data: mockBatch2 });
        
        const wrapper = mount(OrbitBatchDetail, {
            props: {
                batchNumber: '123'
            },
            global: {
                stubs,
                mocks: {
                    $route: {
                        params: {
                            batchNumber: '123'
                        }
                    }
                }
            }
        });

        await flushPromises();

        // Change the batchNumber prop
        await wrapper.setProps({ batchNumber: '124' });
        await flushPromises();

        expect(server.getOrbitBatchDetail).toHaveBeenCalledTimes(2);
        expect(server.getOrbitBatchDetail).toHaveBeenNthCalledWith(1, '123');
        expect(server.getOrbitBatchDetail).toHaveBeenNthCalledWith(2, '124');
    });
});