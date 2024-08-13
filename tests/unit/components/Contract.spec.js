import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

jest.mock('@metamask/detect-provider');
import Contract from '@/components/Contract.vue';

let helper;
const stubs = [
    'Import-Artifact-Modal',
    'Remove-Contract-Confirmation-Modal',
    'Hash-Link',
    'Contract-Interaction',
    'Contract-Logs',
    'Contract-Storage',
    'Contract-Code',
    'Address-Transactions-List'
];

describe('Contract.vue', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        helper = new MockHelper();
        jest.spyOn(helper.mocks.server, 'getAccountBalance')
            .mockResolvedValue('10000');
        jest.spyOn(helper.mocks.server, 'getAddressStats')
            .mockResolvedValue({ data: {
                sentTransactionCount: 1,
                receivedTransactionCount: 2,
                sentErc20TokenTransferCount: 3,
                receivedErc20TokenTransferCount: 4
            }});
    });

    it('Should not display storage option if disabled', async () => {
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

        const wrapper = helper.mountFn(Contract, {
            propsData: {
                hash: '0x123'
            },
            stubs: stubs,
            getters: {
                currentWorkspace: jest.fn().mockReturnValue({
                    storageEnabled: false,
                    isAdmin: true,
                    chain: 'ethereum',
                    networkId: null,
                    rpcServer: null,
                    name: 'Hardhat',
                    settings: {}
                })
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display a warning if not a contract', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: null });
        const wrapper = helper.mountFn(Contract, {
            propsData: {
                hash: '0x123'
            },
            stubs: stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display only address & creation if not a token', (done) => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: {
                name: 'Contract',
                patterns: [],
                address: '0x123',
                creationTransaction: '0xabc'
            }});
        const wrapper = helper.mountFn(Contract, {
            propsData: {
                hash: '0x123'
            },
            stubs: stubs
        });

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 2000);
    });

    it('Should display token info if available', async () => {
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

        const wrapper = helper.mountFn(Contract, {
            propsData: {
                hash: '0x123'
            },
            stubs: stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not display delete option if not admin', (done) => {
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

        const wrapper = helper.mountFn(Contract, {
            propsData: {
                hash: '0x123'
            },
            stubs: stubs,
            getters: {
                isUserAdmin: jest.fn(() => false)
            }
        });

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 2000);
    });
});
