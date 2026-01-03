import OpBatchOverview from '@/components/OpBatchOverview.vue';

describe('OpBatchOverview.vue', () => {
    const mockBatch = {
        batchIndex: 100,
        status: 'confirmed',
        timestamp: '2024-01-01T00:00:00.000Z',
        txCount: 50,
        l2BlockStart: 1000,
        l2BlockEnd: 1049,
        l1TransactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        l1BlockNumber: 12345,
        dataContainer: 'in_blob4844',
        blobHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        parentChainExplorer: 'https://eth.blockscout.com'
    };

    it('Should render batch information', async () => {
        const wrapper = mount(OpBatchOverview, {
            props: {
                batch: mockBatch
            },
            global: {
                stubs: ['router-link']
            }
        });

        expect(wrapper.text()).toContain('100');
        expect(wrapper.text()).toContain('Confirmed');
        expect(wrapper.text()).toContain('50');
    });

    it('Should render L1 transaction link with correct explorer URL', async () => {
        const wrapper = mount(OpBatchOverview, {
            props: {
                batch: mockBatch
            },
            global: {
                stubs: ['router-link']
            }
        });

        const txLink = wrapper.find('a[href*="/tx/"]');
        expect(txLink.exists()).toBe(true);
        expect(txLink.attributes('href')).toContain('eth.blockscout.com');
        expect(txLink.attributes('href')).toContain(mockBatch.l1TransactionHash);
    });

    it('Should render blob hash link when dataContainer is in_blob4844', async () => {
        const wrapper = mount(OpBatchOverview, {
            props: {
                batch: mockBatch
            },
            global: {
                stubs: ['router-link']
            }
        });

        const blobLink = wrapper.find('a[href*="/blob/"]');
        expect(blobLink.exists()).toBe(true);
        expect(blobLink.attributes('href')).toContain(mockBatch.blobHash);
    });

    it('Should use default explorer when parentChainExplorer is not set', async () => {
        const batchWithoutExplorer = { ...mockBatch, parentChainExplorer: null };

        const wrapper = mount(OpBatchOverview, {
            props: {
                batch: batchWithoutExplorer
            },
            global: {
                stubs: ['router-link']
            }
        });

        const txLink = wrapper.find('a[href*="/tx/"]');
        expect(txLink.attributes('href')).toContain('eth.blockscout.com');
    });
});
