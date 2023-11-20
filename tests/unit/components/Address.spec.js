import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';
import Address from '@/components/Address.vue';

let helper;
const stubs = [
    'Hash-Link',
    'Address-Transactions-List',
    'Address-Token-Transfers',
    'Token-Balances'
];

describe('Address.vue', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        helper = new MockHelper();
        jest.spyOn(helper.mocks.server, 'getAccountBalance')
            .mockResolvedValue('10000');
        jest.spyOn(helper.mocks.server, 'getAddressTransactions')
            .mockResolvedValue({ data: { items: [] }});
        jest.spyOn(helper.mocks.server, 'getAddressStats')
            .mockResolvedValue({ data: {
                sentTransactionCount: 1,
                receivedTransactionCount: 2,
                sentErc20TokenTransferCount: 3,
                receivedErc20TokenTransferCount: 4
            }});
    });

    it('Should display EOA accounts stats', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: null });
        const wrapper = helper.mountFn(Address, {
            propsData: {
                hash: '0x123'
            },
            stubs: stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display ERC20 contract stats', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: {
                name: 'ERC20 Contract',
                patterns: ['erc20'],
                tokenName: 'ERC20 Token',
                tokenSymbol: 'ERC',
                tokenDecimals: 18,
                address: '0x123',
                creationTransaction: '0xabc'
            }});

        const wrapper = helper.mountFn(Address, {
            propsData: {
                hash: '0x123'
            },
            stubs: stubs
        });

        await flushPromises();
        await flushPromises(); // Need that second one, not everything seems to be flushed here for some reason....
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display ERC721 contract stats', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: {
                name: 'ERC721 Contract',
                patterns: ['erc721'],
                tokenName: 'ERC721 Token',
                tokenSymbol: 'ERC',
                tokenDecimals: 18,
                address: '0x123',
                creationTransaction: '0xabc'
            }});

        const wrapper = helper.mountFn(Address, {
            propsData: {
                hash: '0x123'
            },
            stubs: stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
