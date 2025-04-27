import TransactionReceiptDetail from '@/components/TransactionReceiptDetail.vue';

describe('TransactionReceiptDetail.vue', () => {
    // Test that the component properly displays and formats all receipt fields
    it('Should display transaction receipt details', async () => {
        const mockReceipt = {
            blockHash: '0x123456789',
            blockNumber: 12345,
            transactionHash: '0x987654321',
            status: true,
            gasUsed: '21000',
            effectiveGasPrice: '0x1234',
            cumulativeGasUsed: 50000,
            from: '0xabcdef123456',
            to: '0x654321fedcba'
        };

        const wrapper = mount(TransactionReceiptDetail, {
            props: {
                receipt: mockReceipt
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    // Test that the component handles null/undefined values gracefully
    it('Should handle empty or null values', async () => {
        const mockReceipt = {
            blockHash: null,
            blockNumber: undefined,
            transactionHash: '0x987654321',
            status: false
        };

        const wrapper = mount(TransactionReceiptDetail, {
            props: {
                receipt: mockReceipt
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    // Test that long hex strings are preserved and not converted to numbers
    it('Should format large hex numbers', async () => {
        const mockReceipt = {
            value: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        };

        const wrapper = mount(TransactionReceiptDetail, {
            props: {
                receipt: mockReceipt
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
}); 