<template>
    <v-container fluid>
        <Metamask />
        <v-row justify="center" align="center" class="mb-10 my-0">
            <v-col md="6" sm="12">
                <v-card outlined class="rounded-card rounded-xl pa-12">
                    <v-card-title class="primary--text d-flex justify-center align-center">DEX</v-card-title>
                    <v-card-text class="pb-0">
                        <v-text-field
                            dense
                            class="rounded-xl"
                            placeholder="0.0"
                            persistent-placeholder
                            outlined
                            v-model="sell.amount"
                            label="Sell">
                            <template v-slot:append>
                                <v-select
                                    class="mb-6 mt-5"
                                    outlined
                                    dense
                                    label="Token"
                                    v-model="sell.token"
                                    item-text="tokenSymbol"
                                    hide-details="auto"
                                    :items="tokens"
                                    return-object>
                                </v-select>
                            </template>
                        </v-text-field>
                        <v-text-field
                            dense
                            class="rounded-xl"
                            placeholder="0.0"
                            persistent-placeholder
                            outlined
                            v-model="buy.amount"
                            label="Buy">
                            <template v-slot:append>
                                <v-select
                                    class="mb-6 mt-5"
                                    width="50px"
                                    outlined
                                    dense
                                    label="Token"
                                    v-model="buy.token"
                                    item-text="tokenSymbol"
                                    hide-details="auto"
                                    :items="tokens"
                                    return-object>
                                </v-select>
                            </template>
                        </v-text-field>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
const ethers = require('ethers');
import Metamask from './Metamask';
import { abi as UniswapV2PairABI } from '@/abis/IUniswapV2Pair';
import { abi as IUniswapV2Router02ABI } from '@/abis/IUniswapV2Router02';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { Pair, Route, Trade } from '@uniswap/v2-sdk';
import { mapGetters } from 'vuex';
import { getProvider } from '@/lib/rpc';

export default{
    name: 'ExplorerDex',
    components: {
        Metamask
    },
    data: () => ({
        loading: false,
        errorMessage: null,
        wCAGA: null,
        USDT: null,
        CTT: null,
        router: null,
        tokens: [],
        sell: {
            amount: null,
            token: {}
        },
        buy: {
            amount: null,
            token: {}
        }
    }),
    mounted() {
        this.loadTokens();
        this.wCAGA = new Token(this.chainId, '0xf22d0f6ed0c214e9e4a14eeb1fbabbbb3567d7af', 18),
        this.USDT = new Token(this.chainId, '0x99d46f7e4eff4b322bd3f0387aeb82e66bf03db0', 18)
        this.CTT = new Token(this.chainId, '0x47e405b514068e1963fbf84006009bea4edd26b2', 18);
        this.USDC = new Token(this.chainId, '0xc9e8634d0ec6e3cb049b7d043a910d4830315ef3', 18);
    },
    methods: {
        selectionChanged() {
            if (!this.sell.amount || !this.sell.token.address || !this.buy.amount || !this.buy.token.address)
                return;
        },
        loadTokens() {
            this.server.getV2DexTokens()
                .then(({ data: { tokens }}) => this.tokens = tokens)
                .catch(console.log);
        },
        trade() {
            this.createPair()
            .then(pair => {
                const route = new Route([pair], this.wCAGA, this.USDC);
                const trade = new Trade(route, CurrencyAmount.fromRawAmount(this.wCAGA, '10000000000000000'), TradeType.EXACT_INPUT);
                console.log(trade.executionPrice.toSignificant(8));

                const slippageTolerance = new Percent('50', '10000');
                const amountIn = ethers.utils.parseUnits(trade.inputAmount.toExact(), 18);
                const amountOutMin = ethers.utils.parseUnits(trade.minimumAmountOut(slippageTolerance).toExact(), 18);
                const path = [this.wCAGA.address, this.USDC.address];
                const to = '0x1bF85ED48fcda98e2c7d08E4F2A8083fb18792AA';
                const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
                console.log(amountIn, amountOutMin, path, to, deadline)

                const signer = this.provider.getSigner(to);
                const routerContract = new ethers.Contract('0xf91d509a2b53bdec334be59d7050bdd2e0264fca', IUniswapV2Router02ABI, signer);

                const options = {
                    from: to,
                    value: amountIn.toHexString()
                };
                routerContract.populateTransaction.swapExactETHForTokens(amountOutMin, path, to, deadline, options)
                    .then(transaction => {
                        const params = {
                            ...transaction,
                            gasPrice: '0xa',
                            value: amountIn.toHexString()
                        }
                        window.ethereum.request({
                            method: 'eth_sendTransaction',
                            params: [params]
                        })
                        .then(console.log)
                        .catch(console.log())
                    })
                    .catch(console.log)
            })
            .catch(console.log);
        },
        async createPair() {
            // const pairAddress = Pair.getAddress(this.USDT, this.CTT);
            // console.log(pairAddress)
            const pairAddress = '0x52F1c57251B0CbEfac229bc139d6F47Cf610D406'.toLowerCase();
            const pairContract = new ethers.Contract(pairAddress, UniswapV2PairABI, this.provider);
            const reserves = await pairContract["getReserves"]();
            const [reserve0, reserve1] = reserves;
            console.log(reserves)
            const tokens = [this.USDC, this.wCAGA];
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
<style>
  .v-text-field input {
    font-size: 1.75em;
  }
</style>
