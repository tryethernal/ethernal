<template>
    <v-container fluid>
        <v-row justify="center" align="center" class="mb-10 my-0">
            <v-col md="6" sm="12">
                <v-card outlined class="rounded-card rounded-xl pa-12">
                    <v-card-title class="primary--text d-flex justify-center align-center">DEX</v-card-title>
                    <v-card-text class="pb-0">
                        Dex
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
const ethers = require('ethers');
import { abi as UniswapV2PairABI } from '@/abis/IUniswapV2Pair';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { AlphaRouter, SwapType, UniswapMulticallProvider, V3PoolProvider } from '@tryethernal/smart-order-router';
import { Pair } from '@uniswap/v2-sdk';
import { mapGetters } from 'vuex';
import { getProvider } from '@/lib/rpc';

export default{
    name: 'ExplorerDex',
    data: () => ({
        loading: false,
        errorMessage: null,
        wCAGA: null,
        USDT: null,
        CTT: null,
        router: null
    }),
    mounted() {
        this.wCAGA = new Token(this.chainId, '0xf22d0f6ed0c214e9e4a14eeb1fbabbbb3567d7af', 18),
        this.USDT = new Token(this.chainId, '0x99d46f7e4eff4b322bd3f0387aeb82e66bf03db0', 18)
        this.CTT = new Token(this.chainId, '0x47e405b514068e1963fbf84006009bea4edd26b2', 18);
        this.multicall = new UniswapMulticallProvider(this.chainId, this.provider, 1000000, '0xdd7e5a61a425d1cc72e4912c75dec6d5fc42a755');
        const v3PoolProvider = new V3PoolProvider(this.chainId, this.multicall);
        this.router = new AlphaRouter({
            chainId: this.chainId,
            provider: this.provider,
            multicall2Provider: this.multicall,
            v3PoolProvider
        })
        const options = {
            recipient: '0x2b9df63290c4d7e4a945610054c61f26ffed3905',
            slippageTolerance: new Percent(50, 10000),
            deadline: Math.floor(Date.now() / 1000 + 1800),
            type: SwapType.SWAP_ROUTER_02,
        };
        this.router.route(
            CurrencyAmount.fromRawAmount(this.USDT, '1000000000000000000'),
            this.CTT,
            TradeType.EXACT_INPUT,
            options
        ).then(route => {
            console.log(route);
        });
        // this.createPair()
        //     .then(pair => {
        //         const route = new Route([pair], this.USDT, this.wCAGA);
        //         const trade = new Trade(route, CurrencyAmount.fromRawAmount(this.USDT, '1000000000000000000'), TradeType.EXACT_INPUT);
        //         console.log(trade.executionPrice.toSignificant(8));
        //         console.log(trade.executionPrice.invert().toSignificant(8));
        //     })
        //     .catch(console.log);
    },
    methods: {
        async createPair() {
            // const pairAddress = Pair.getAddress(this.USDT, this.CTT);
            // console.log(pairAddress)
            const pairAddress = '0xd7c2246DF3872ecE4F4eFc230Ee3477F2664955d'.toLowerCase();
            const pairContract = new ethers.Contract(pairAddress, UniswapV2PairABI, this.provider);
            const reserves = await pairContract["getReserves"]();
            const [reserve0, reserve1] = reserves;
            console.log(reserves)
            const tokens = [this.USDT, this.wCAGA];
            const [token0, token1] = tokens[0].sortsBefore(tokens[1]) ? tokens : [tokens[1], tokens[0]];

            const pair = new Pair(CurrencyAmount.fromRawAmount(token0, reserve0), CurrencyAmount.fromRawAmount(token1, reserve1));
            return pair;
        }
    },
    computed: {
        ...mapGetters([
            'publicExplorer',
        ]),
        provider() {
            return getProvider(this.publicExplorer.rpcServer);
        },
        chainId() {
            return parseInt(this.publicExplorer.chainId);
        }
    }
}
</script>
