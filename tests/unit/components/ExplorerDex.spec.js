import '../mocks/ethers';
import '../mocks/rpc';
import '../mocks/utils';
const { ERC20Connector, V2DexRouterConnector } = require('@/lib/rpc');

import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerDex from '@/components/ExplorerDex.vue';
const balances = [
    {
        "token": "0x47e405b514068e1963fbf84006009bea4edd26b2",
        "address": "0x1bf85ed48fcda98e2c7d08e4f2a8083fb18792aa",
        "currentBalance": "4000000000000000",
        "tokenContract": {
            "name": null,
            "tokenName": "CagaTestToken",
            "tokenSymbol": "CTT",
            "tokenDecimals": 18,
            "address": "0x47e405b514068e1963fbf84006009bea4edd26b2",
        }
    },
    {
        "token": "0x7a85870aff6577d89a4906b48b966262a58e0d90",
        "address": "0x1bf85ed48fcda98e2c7d08e4f2a8083fb18792aa",
        "currentBalance": "0",
        "tokenContract": {
            "name": null,
            "tokenName": "Wrapped BTC",
            "tokenSymbol": "WBTC",
            "tokenDecimals": 18,
            "address": "0x7a85870aff6577d89a4906b48b966262a58e0d90",
        }
    },
    {
        "token": "0x99d46f7e4eff4b322bd3f0387aeb82e66bf03db0",
        "address": "0x1bf85ed48fcda98e2c7d08e4f2a8083fb18792aa",
        "currentBalance": "104406259119420540715",
        "tokenContract": {
            "name": null,
            "tokenName": "Tether USD",
            "tokenSymbol": "USDT",
            "tokenDecimals": 18,
            "address": "0x99d46f7e4eff4b322bd3f0387aeb82e66bf03db0",
        }
    },
    {
        "token": "0xc9e8634d0ec6e3cb049b7d043a910d4830315ef3",
        "address": "0x1bf85ed48fcda98e2c7d08e4f2a8083fb18792aa",
        "currentBalance": "224022694968057601865",
        "tokenContract": {
            "name": null,
            "tokenName": "USDC",
            "tokenSymbol": "USDC",
            "tokenDecimals": 18,
            "address": "0xc9e8634d0ec6e3cb049b7d043a910d4830315ef3",
        }
    },
    {
        "token": "0xfefe8aded61ff2559ed6bad2075a9f53bd745164",
        "address": "0x1bf85ed48fcda98e2c7d08e4f2a8083fb18792aa",
        "currentBalance": "2211206156660708359215471",
        "tokenContract": {
            "name": null,
            "tokenName": "minion",
            "tokenSymbol": "minion",
            "tokenDecimals": 18,
            "address": "0xfefe8aded61ff2559ed6bad2075a9f53bd745164",
        }
    }
]
const tokens = [{"address":"0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","tokenSymbol":"CAGA","tokenName":"CAGA"},{"address":"0xf22d0f6ed0c214e9e4a14eeb1fbabbbb3567d7af","tokenName":"Wrapped CAGA","tokenSymbol":"wCAGA","tokenDecimals":18},{"address":"0x857091395675228d991b571fae96c1e09e25fb54","tokenName":"Testt","tokenSymbol":"Testt","tokenDecimals":18},{"address":"0xefbb39ae7ba5b84e970f6ad1d8fa689341445962","tokenName":"test_1_wcaga","tokenSymbol":"test_1_wcaga","tokenDecimals":18},{"address":"0x19295bd9cb3a6db1b7b80ad260924391fb883416","tokenName":"Dadang1","tokenSymbol":"Dadang1","tokenDecimals":18},{"address":"0x7a85870aff6577d89a4906b48b966262a58e0d90","tokenName":"Wrapped BTC","tokenSymbol":"WBTC","tokenDecimals":18},{"address":"0xf939ba0b971352168c270abe9b9f4ad4c86d81e2","tokenName":"CAGA N Token","tokenSymbol":"CNT","tokenDecimals":18},{"address":"0x23867645eae95f649e9e5528125530ab1091b74f","tokenName":"cag2","tokenSymbol":"catcat2","tokenDecimals":18},{"address":"0x059ee61ef0126db8f01a5f19b5615d529aeb638e","tokenName":"instant_king1","tokenSymbol":"instant_king1","tokenDecimals":18},{"address":"0xc6032722b5e79f1f26390679848b719a5648e5b7","tokenName":"tate","tokenSymbol":"tate","tokenDecimals":18},{"address":"0x71f33e30896495a1210ead715d6b130d88848145","tokenName":"dontbuy","tokenSymbol":"dontbuy","tokenDecimals":18},{"address":"0x47e405b514068e1963fbf84006009bea4edd26b2","tokenName":"CagaTestToken","tokenSymbol":"CTT","tokenDecimals":18},{"address":"0x99d46f7e4eff4b322bd3f0387aeb82e66bf03db0","tokenName":"Tether USD","tokenSymbol":"USDT","tokenDecimals":18},{"address":"0xc9e8634d0ec6e3cb049b7d043a910d4830315ef3","tokenName":"USDC","tokenSymbol":"USDC","tokenDecimals":18},{"address":"0x1f4682f0015a20557f61101268f8e3d2ddb9df59","tokenName":"Wrapped CAGA","tokenSymbol":"wCAGA","tokenDecimals":18},{"address":"0x2b53f065a947a702e06e4601b64dc6850aa58dcf","tokenName":"Universal Test Token","tokenSymbol":"UniToken","tokenDecimals":18},{"address":"0x683699f719d2cf3c5836a490606f879b3dd008e4","tokenName":"Dadang","tokenSymbol":"Dadada","tokenDecimals":18},{"address":"0x1102d33f0ae163f7c977bbd7fe54546ec1463045","tokenName":"calculator","tokenSymbol":"calc","tokenDecimals":18},{"address":"0x060d05d5ec86ec9079e93b161bdb1326179f4c26","tokenName":"hawk tuah","tokenSymbol":"hawktuah","tokenDecimals":18},{"address":"0x3b7a4b48a88e511d0064b20e3ba8166ff29751f0","tokenName":"DOGBEE 3","tokenSymbol":"DOGBEE 3","tokenDecimals":18},{"address":"0x4bb796b90e3bafef741826822ee85a80b22a8a21","tokenName":"CagaTest2Token","tokenSymbol":"CTT","tokenDecimals":2},{"address":"0xa56c95463783db23d4e06090e9fe41272dd93a70","tokenName":"Yyyy","tokenSymbol":"Yyhh","tokenDecimals":18},{"address":"0xc98edd6b1300b968eb0557f026b7b37c20c86861","tokenName":"VV Balance","tokenSymbol":"VV Balance","tokenDecimals":18},{"address":"0xdef504b3714c3ce69215fe0983c9e062797d3012","tokenName":"Dadang2","tokenSymbol":"Dadada2","tokenDecimals":18},{"address":"0x26b4adc514c18ba212b89c3e9444644af02751b1","tokenName":"testing2","tokenSymbol":"testing2","tokenDecimals":18},{"address":"0xda271b712f71219f313f2611695e7ff65d180bb8","tokenName":"Dadang","tokenSymbol":"Dadada","tokenDecimals":18},{"address":"0xa85ab9af607a3ae5498089057a59fc2b9399425d","tokenName":"test2","tokenSymbol":"test2","tokenDecimals":18},{"address":"0x564102ba730896f15f9220fead32e372a665b75e","tokenName":"Doge Coin","tokenSymbol":"DOGE","tokenDecimals":18},{"address":"0x5a861d0a28e7a14413b75bb4d6de62f863dab025","tokenName":"TTT","tokenSymbol":"TTT","tokenDecimals":18},{"address":"0xe3411e3adea6bd00f8182e8fa24ca2b2c9a5dc63","tokenName":"Super Panda6","tokenSymbol":"SPD6","tokenDecimals":18},{"address":"0x10b5c301df60467f6e88930cd0910ecf71940920","tokenName":"DOGBEE","tokenSymbol":"DOGBEE","tokenDecimals":18},{"address":"0x4cbd9de7136f38375f9315542bb613625c4a9f4b","tokenName":"test4","tokenSymbol":"test4","tokenDecimals":18},{"address":"0xe9b31e412925928136a086f151545b9dd36e6054","tokenName":"testcat","tokenSymbol":"testcat","tokenDecimals":18}];
const quote = {
    "lpFee": "0.059",
    "inputAmount": "10",
    "outputAmount": "0.0000324561",
    "minimumAmountOut": "0.00003229",
    "maximumAmountIn": "10",
    "priceImpact": "0.0000047",
    "executionPrice": "0.0000032456",
    "invertedExecutionPrice": "308110",
    "path": [
      {
        "chainId": 72778,
        "decimals": 18,
        "symbol": "minion",
        "name": "minion",
        "isNative": false,
        "isToken": true,
        "address": "0xFEfe8ADeD61fF2559ed6bAd2075A9f53Bd745164"
      },
      {
        "chainId": 72778,
        "decimals": 18,
        "symbol": "wCAGA",
        "name": "Wrapped CAGA",
        "isNative": false,
        "isToken": true,
        "address": "0xF22d0f6ed0C214e9e4A14EEb1fbAbbBB3567D7af"
      },
      {
        "chainId": 72778,
        "decimals": 18,
        "symbol": "USDT",
        "name": "Tether USD",
        "isNative": false,
        "isToken": true,
        "address": "0x99d46F7e4EfF4B322BD3F0387AeB82E66bf03dB0"
      }
    ]
};

describe('ExplorerDex.vue', () => {
    let helper;
    const stubs = ['Metamask', 'Hash-Link', 'Dex-Token-Selection-Modal', 'Explorer-Dex-Parameter-Modal'];

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display no dex message', async () => {
        const wrapper = helper.mountFn(ExplorerDex, {
            stubs,
            getters: {
                publicExplorer: jest.fn(() => ({ v2Dex: null }))
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display initial state with no wallet connected', async () => {
        jest.spyOn(helper.mocks.server, 'getV2DexTokens').mockResolvedValueOnce({ data: { tokens }});
        const wrapper = helper.mountFn(ExplorerDex, {
            stubs,
            getters: {
                publicExplorer: jest.fn().mockReturnValue({
                    v2Dex: { routerAddress: '0x123' }
                })
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display initial state with wallet connected', async () => {
        ERC20Connector.mockImplementationOnce(() => ({
            allowance: jest.fn().mockResolvedValue('0')
        }));
        jest.spyOn(helper.mocks.server, 'getV2DexTokens').mockResolvedValueOnce({ data: { tokens }});
        jest.spyOn(helper.mocks.server, 'getTokenBalances').mockResolvedValueOnce({ data: balances });
        jest.spyOn(helper.mocks.server, 'getNativeTokenBalance').mockResolvedValueOnce({ data: { balance: '10000000000000000000' }});
        const wrapper = helper.mountFn(ExplorerDex, {
            stubs,
            getters: {
                publicExplorer: jest.fn().mockReturnValue({
                    v2Dex: { routerAddress: '0x123' }
                })
            }
        });
        wrapper.vm.onRpcConnectionStatusChanged({ account: '0x1bF85ED48fcda98e2c7d08E4F2A8083fb18792AA' })
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display insufficient balance warning', async () => {
        ERC20Connector.mockImplementationOnce(() => ({
            allowance: jest.fn().mockResolvedValue('0')
        }));
        jest.spyOn(helper.mocks.server, 'getV2DexTokens').mockResolvedValueOnce({ data: { tokens }});
        jest.spyOn(helper.mocks.server, 'getTokenBalances').mockResolvedValueOnce({ data: balances });
        jest.spyOn(helper.mocks.server, 'getNativeTokenBalance').mockResolvedValueOnce({ data: { balance: '10000000000000000000' }});
        const wrapper = helper.mountFn(ExplorerDex, {
            stubs,
            data: () => ({
                sellAmount: '100'
            }),
            getters: {
                publicExplorer: jest.fn().mockReturnValue({
                    v2Dex: { routerAddress: '0x123' }
                })
            }
        });
        wrapper.vm.onRpcConnectionStatusChanged({ account: '0x1bF85ED48fcda98e2c7d08E4F2A8083fb18792AA' })
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display token selection message', async () => {
        ERC20Connector.mockImplementationOnce(() => ({
            allowance: jest.fn().mockResolvedValue('0')
        }));
        jest.spyOn(helper.mocks.server, 'getV2DexTokens').mockResolvedValueOnce({ data: { tokens }});
        jest.spyOn(helper.mocks.server, 'getTokenBalances').mockResolvedValueOnce({ data: balances });
        jest.spyOn(helper.mocks.server, 'getNativeTokenBalance').mockResolvedValueOnce({ data: { balance: '10000000000000000000' }});
        const wrapper = helper.mountFn(ExplorerDex, {
            stubs,
            data: () => ({
                sellAmount: '0.1'
            }),
            getters: {
                publicExplorer: jest.fn().mockReturnValue({
                    v2Dex: { routerAddress: '0x123' }
                })
            }
        });
        wrapper.vm.onRpcConnectionStatusChanged({ account: '0x1bF85ED48fcda98e2c7d08E4F2A8083fb18792AA' })
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display approval & swap button if not enough approval', async () => {
        ERC20Connector.mockImplementation(() => ({
            allowance: jest.fn().mockResolvedValue('0')
        }));
        jest.spyOn(helper.mocks.server, 'getV2DexTokens').mockResolvedValueOnce({ data: { tokens }});
        jest.spyOn(helper.mocks.server, 'getTokenBalances').mockResolvedValueOnce({ data: balances });
        jest.spyOn(helper.mocks.server, 'getNativeTokenBalance').mockResolvedValueOnce({ data: { balance: '10000000000000000000' }});
        jest.spyOn(helper.mocks.server, 'getV2DexQuote').mockResolvedValue({ data: { quote }});
        const wrapper = helper.mountFn(ExplorerDex, {
            stubs,
            data: () => ({
                quoteDirection: 'exactIn'
            }),
            getters: {
                publicExplorer: jest.fn().mockReturnValue({
                    v2Dex: { routerAddress: '0x123' }
                })
            }
        });
        await flushPromises();

        wrapper.vm.onRpcConnectionStatusChanged({ account: '0x1bF85ED48fcda98e2c7d08E4F2A8083fb18792AA' })

        wrapper.vm.sellToken = {
            tokenSymbol: 'ETL',
            address: '0x47e405b514068e1963fbf84006009bea4edd26b2',
        }
        await flushPromises();

        wrapper.setData({
            sellAmount: '0.001',
            buyToken: {
                tokenSymbol: 'BTC',
                address: '0xFEfe8ADeD61fF2559ed6bAd2075A9f53Bd745164'
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display swap button and quote', async () => {
        ERC20Connector.mockImplementation(() => ({
            allowance: jest.fn().mockResolvedValue('10000000000000000000000000000000')
        }));
        jest.spyOn(helper.mocks.server, 'getV2DexTokens').mockResolvedValueOnce({ data: { tokens }});
        jest.spyOn(helper.mocks.server, 'getTokenBalances').mockResolvedValueOnce({ data: balances });
        jest.spyOn(helper.mocks.server, 'getNativeTokenBalance').mockResolvedValueOnce({ data: { balance: '10000000000000000000' }});
        jest.spyOn(helper.mocks.server, 'getV2DexQuote').mockResolvedValue({ data: { quote }});
        const wrapper = helper.mountFn(ExplorerDex, {
            stubs,
            data: () => ({
                quoteDirection: 'exactIn'
            }),
            getters: {
                publicExplorer: jest.fn().mockReturnValue({
                    v2Dex: { routerAddress: '0x123' }
                })
            }
        });
        await flushPromises();

        wrapper.vm.onRpcConnectionStatusChanged({ account: '0x1bF85ED48fcda98e2c7d08E4F2A8083fb18792AA' })

        wrapper.setData({
            sellAmount: '0.001',
            buyToken: {
                tokenSymbol: 'BTC',
                address: '0xFEfe8ADeD61fF2559ed6bAd2075A9f53Bd745164'
            },
            sellToken: {
                tokenSymbol: 'ETL',
                address: '0x47e405b514068e1963fbf84006009bea4edd26b2',
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display successful transaction message', async () => {
        ERC20Connector.mockImplementation(() => ({
            allowance: jest.fn().mockResolvedValue('10000000000000000000000000000000')
        }));
        jest.spyOn(helper.mocks.server, 'getV2DexTokens').mockResolvedValueOnce({ data: { tokens }});
        jest.spyOn(helper.mocks.server, 'getTokenBalances').mockResolvedValueOnce({ data: balances });
        jest.spyOn(helper.mocks.server, 'getNativeTokenBalance').mockResolvedValueOnce({ data: { balance: '10000000000000000000' }});
        jest.spyOn(helper.mocks.server, 'getV2DexQuote').mockResolvedValue({ data: { quote }});
        const wrapper = helper.mountFn(ExplorerDex, {
            stubs,
            data: () => ({
                quoteDirection: 'exactIn'
            }),
            getters: {
                publicExplorer: jest.fn().mockReturnValue({
                    v2Dex: { routerAddress: '0x123' }
                })
            }
        });
        await flushPromises();

        wrapper.vm.onRpcConnectionStatusChanged({ account: '0x1bF85ED48fcda98e2c7d08E4F2A8083fb18792AA' })

        wrapper.setData({
            sellAmount: '0.001',
            buyToken: {
                tokenSymbol: 'BTC',
                address: '0xFEfe8ADeD61fF2559ed6bAd2075A9f53Bd745164'
            },
            sellToken: {
                tokenSymbol: 'ETL',
                address: '0x47e405b514068e1963fbf84006009bea4edd26b2',
            }
        });
        await flushPromises();

        const transaction = {
            wait: jest.fn().mockResolvedValueOnce({ hash: '0xcff8dfb02341df3e011e58ebbe0b09742a6dbbbee208a7e4253adeea05f75174', status: 1 })
        };
        await wrapper.vm.waitForTransaction(transaction, 'Swap successful.', 'Swap failed');

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display failed transaction message', async () => {
        ERC20Connector.mockImplementation(() => ({
            allowance: jest.fn().mockResolvedValue('10000000000000000000000000000000')
        }));
        jest.spyOn(helper.mocks.server, 'getV2DexTokens').mockResolvedValueOnce({ data: { tokens }});
        jest.spyOn(helper.mocks.server, 'getTokenBalances').mockResolvedValueOnce({ data: balances });
        jest.spyOn(helper.mocks.server, 'getNativeTokenBalance').mockResolvedValueOnce({ data: { balance: '10000000000000000000' }});
        jest.spyOn(helper.mocks.server, 'getV2DexQuote').mockResolvedValue({ data: { quote }});
        const wrapper = helper.mountFn(ExplorerDex, {
            stubs,
            data: () => ({
                quoteDirection: 'exactIn'
            }),
            getters: {
                publicExplorer: jest.fn().mockReturnValue({
                    v2Dex: { routerAddress: '0x123' }
                })
            }
        });
        await flushPromises();

        wrapper.vm.onRpcConnectionStatusChanged({ account: '0x1bF85ED48fcda98e2c7d08E4F2A8083fb18792AA' })

        wrapper.setData({
            sellAmount: '0.001',
            buyToken: {
                tokenSymbol: 'BTC',
                address: '0xFEfe8ADeD61fF2559ed6bAd2075A9f53Bd745164'
            },
            sellToken: {
                tokenSymbol: 'ETL',
                address: '0x47e405b514068e1963fbf84006009bea4edd26b2',
            }
        });
        await flushPromises();

        const transaction = {
            wait: jest.fn().mockResolvedValueOnce({ hash: '0xcff8dfb02341df3e011e58ebbe0b09742a6dbbbee208a7e4253adeea05f75174', status: 0 })
        };
        await wrapper.vm.waitForTransaction(transaction, 'Swap successful.', 'Swap failed.');

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display error message', async () => {
        ERC20Connector.mockImplementation(() => ({
            allowance: jest.fn().mockResolvedValue('10000000000000000000000000000000')
        }));
        V2DexRouterConnector.mockImplementation(() => ({
            swapExactTokensForTokens: jest.fn().mockRejectedValue({ reason: 'Failed' })
        }));
        jest.spyOn(helper.mocks.server, 'getV2DexTokens').mockResolvedValueOnce({ data: { tokens }});
        jest.spyOn(helper.mocks.server, 'getTokenBalances').mockResolvedValueOnce({ data: balances });
        jest.spyOn(helper.mocks.server, 'getNativeTokenBalance').mockResolvedValueOnce({ data: { balance: '10000000000000000000' }});
        jest.spyOn(helper.mocks.server, 'getV2DexQuote').mockResolvedValue({ data: { quote }});
        const wrapper = helper.mountFn(ExplorerDex, {
            stubs,
            data: () => ({
                quoteDirection: 'exactIn'
            }),
            getters: {
                publicExplorer: jest.fn().mockReturnValue({
                    v2Dex: { routerAddress: '0x123' }
                })
            }
        });
        await flushPromises();

        wrapper.vm.onRpcConnectionStatusChanged({ account: '0x1bF85ED48fcda98e2c7d08E4F2A8083fb18792AA' })

        wrapper.setData({
            sellAmount: '0.001',
            buyToken: {
                tokenSymbol: 'BTC',
                address: '0xFEfe8ADeD61fF2559ed6bAd2075A9f53Bd745164'
            },
            sellToken: {
                tokenSymbol: 'ETL',
                address: '0x47e405b514068e1963fbf84006009bea4edd26b2',
            },
        });
        await flushPromises();

        await wrapper.vm.swap();
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
