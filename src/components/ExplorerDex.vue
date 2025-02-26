<template>
    <v-container fluid>
        <template v-if="v2Dex">
            <Dex-Token-Selection-Modal ref="dexTokenSelectionModal" />
            <Explorer-Dex-Parameters-Modal @parametersChanged="dexParametersChanged" ref="explorerDexParametersModal" />
            <v-row>
                <v-col align="center">
                    <v-icon style="opacity: 0.25;" size="150" color="primary-lighten-1">mdi-swap-horizontal</v-icon>
                </v-col>
            </v-row>
            <v-row justify="center" align="center" class="mb-10 my-0">
                <v-col md="6" sm="12">
                    <v-card class="rounded-card rounded-xl">
                        <div class="mb-5 mt-1 mx-5 d-flex justify-space-between align-center">
                            <template v-if="connectedAddress">
                                <small>Connected Account: <Hash-Link :withName="false" :type="'address'" :hash="connectedAddress" /></small>
                            </template>
                            <template v-else><v-spacer /></template>
                            <v-btn size="small" variant="text" icon="mdi-cog" @click="openExplorerDexParametersModal()"></v-btn>
                        </div>
                        <v-alert density="compact" type="warning" class="mx-5 mb-3" v-if="isDemo">
                            This is a demo dex. Only tokens from liquidity pools deployed <b>after</b> creating this explorer will be available.
                            If you want to add existing liquidity pools & tokens, either subscribe to a plan or reach out to us.
                        </v-alert>
                        <v-alert density="compact" type="info" class="mx-5 mb-3" v-if="isAdmin && pairCount < totalPairs">
                            Syncing liquidity pools & tokens...({{ pairCount }} / {{ totalPairs }})
                        </v-alert>
                        <div class="pa-12 pt-0">
                            <v-card-title class="text-primary d-flex justify-center align-center">{{ explorerName }} DEX</v-card-title>
                            <v-card-text class="pb-0">
                                <v-alert text type="error" v-if="errorMessage" v-html="errorMessage"></v-alert>
                                <div align="center">
                                    <v-text-field
                                        density="compact"
                                        class="large-text"
                                        rounded="xl"
                                        @update:model-value="quoteDirection = 'exactIn'"
                                        placeholder="0.0"
                                        persistent-placeholder
                                        variant="outlined"
                                        label="Sell"
                                        hide-details="auto"
                                        v-model="sellAmount">
                                        <template v-slot:append-inner>
                                            <div class="pl-4 py-1 mt-1 mb-3 d-flex flex-column text-right">
                                                <small class="pr-1 balance">
                                                    Balance:
                                                    <a style="text-decoration: none;" href="#" v-if="BNtoSignificantDigits(balanceOf(sellToken.address)) > 0" @click.prevent="sellAmount = formatEther(balanceOf(sellToken.address))">{{ sellToken && sellToken.address ? BNtoSignificantDigits(balanceOf(sellToken.address)) : '-' }}</a>
                                                    <template v-else>{{ connectedAccount && sellToken && sellToken.address ? BNtoSignificantDigits(balanceOf(sellToken.address)) || 0 : '-' }}</template>
                                                </small>
                                                <v-btn v-if="!loadingTokens" variant="outlined" class="mt-3 text-primary text-no-wrap tokenSelector rounded-pill" @click="openSellTokenSelectionModal()">
                                                    {{ sellToken.tokenSymbol || 'Select a token' }}
                                                    <v-icon class="text-primary">mdi-chevron-down</v-icon>
                                                </v-btn>
                                                <v-btn v-else variant="outlined" class="mt-3 text-primary text-no-wrap tokenSelector rounded-pill">
                                                    <v-progress-circular :size="20" :width="2" indeterminate color="primary"></v-progress-circular>
                                                </v-btn>
                                            </div>
                                        </template>
                                    </v-text-field>
                                    <v-btn size="small" icon="mdi-swap-vertical" @click="invert()" class="my-3" variant="outlined" color="primary"></v-btn>
                                    <v-text-field
                                        density="compact"
                                        class="large-text"
                                        rounded="xl"
                                        @update:model-value="quoteDirection = 'exactOut'"
                                        placeholder="0.0"
                                        persistent-placeholder
                                        hide-details="auto"
                                        variant="outlined"
                                        v-model="buyAmount"
                                        label="Buy">
                                        <template v-slot:append-inner>
                                            <div class="pl-4 py-1 mt-1 mb-3 d-flex flex-column text-right">
                                                <small class="pr-1 balance">Balance: {{ connectedAccount && buyToken && buyToken.address ? BNtoSignificantDigits(balanceOf(buyToken.address)) : '-' }}</small>
                                                <v-btn v-if="!loadingTokens" variant="outlined" class="mt-3 text-primary text-no-wrap tokenSelector rounded-pill" @click="openBuyTokenSelectionModal()">
                                                    {{ buyToken.tokenSymbol || 'Select a token' }}
                                                    <v-icon class="text-primary">mdi-chevron-down</v-icon>
                                                </v-btn>
                                                <v-btn v-else variant="outlined" class="mt-3 text-primary text-no-wrap tokenSelector rounded-pill">
                                                    <v-progress-circular :size="20" :width="2" indeterminate color="primary"></v-progress-circular>
                                                </v-btn>
                                            </div>
                                        </template>
                                    </v-text-field>
                                    <WalletConnectorMirror width="100%" size="large" class="mt-3" v-if="!connectedAddress" />
                                    <div v-else class="mt-3 mb-4">
                                        <template v-if="executionInfo.executionPrice">
                                            <div class="d-flex justify-space-between mx-2">
                                                <span>Price:</span>
                                                <span>
                                                    {{ displayInvertedPrice ? priceText : invertedPriceText }}
                                                    <v-icon class="pb-1" @click="displayInvertedPrice = !displayInvertedPrice" color="primary">mdi-swap-horizontal</v-icon>
                                                </span>
                                            </div>
                                            <div class="d-flex justify-space-between mx-2 mb-3">
                                                <span>Slippage Tolerance:</span>
                                                <span>{{ dexParameters.slippageToleranceInBps / 100 }}%</span>
                                            </div>
                                        </template>
                                        <div class="d-flex">
                                            <template v-if="needsApproval && quotable && validCombination">
                                                <v-btn :disabled="transaction.loading" class="flex-grow-1" size="large" color="primary" @click="approve()">Approve {{ sellToken.tokenSymbol }}</v-btn>
                                                <v-icon>mdi-chevron-right</v-icon>
                                            </template>
                                            <v-btn class="flex-grow-1" size="large" :disabled="swapButtonDisabled" color="primary" @click="swap()">{{ swapButtonText }}</v-btn>
                                        </div>
                                    </div>
                                </div>
                                <v-skeleton-loader v-if="loadingQuote" type="paragraph"></v-skeleton-loader>
                                <div v-else-if="executionInfo.minimumAmountOut" class="mt-4 mb-4">
                                    <div v-if="quoteDirection == 'exactIn'" class="d-flex justify-space-between">
                                        <span>Minimum Received:</span>
                                        <span class="swap-extra-info">{{ executionInfo.minimumAmountOut }} {{ buyToken.tokenSymbol }}</span>
                                    </div>
                                    <div v-else class="d-flex justify-space-between">
                                        <span>Maximum Sold:</span>
                                        <span class="swap-extra-info">{{ executionInfo.maximumAmountIn }} {{ sellToken.tokenSymbol }}</span>
                                    </div>
                                    <div class="d-flex justify-space-between">
                                        <span>Price Impact:</span>
                                        <span :class="`swap-extra-info ${priceImpactSeverityClass}`">{{ formattedPriceImpact }}%</span>
                                    </div>
                                    <div class="d-flex justify-space-between">
                                        <span>Liquidity Provider Fee:</span>
                                        <span class="swap-extra-info">{{ executionInfo.lpFee }} {{ sellToken.tokenSymbol }}</span>
                                    </div>
                                    <div v-if="executionInfo.path.length > 2" class="d-flex justify-space-between">
                                        <span>Route:</span>
                                        <span>
                                            <span v-for="(step, idx) in executionInfo.path" :key="idx" class="swap-extra-info">
                                                {{ step.symbol }} <v-icon v-if="idx < executionInfo.path.length - 1">mdi-chevron-right</v-icon>
                                            </span>
                                        </span>
                                    </div>
                                </div>
                                <div v-if="transaction.status" class="mt-8" align="middle">
                                    <template v-if="transaction.status == 'loading'">
                                        <span class="text-primary font-weight-bold">{{ transaction.text }}</span>
                                        <v-progress-linear height="5" rounded indeterminate color="primary"></v-progress-linear>
                                    </template>
                                    <template v-else-if="transaction.status == 'success'">
                                        <v-icon style="vertical-align: text-bottom" size="small" class="mr-1" color="success">mdi-check-circle</v-icon>
                                        <span class="text-success font-weight-bold">{{ transaction.text }} <Hash-Link :type="'transaction'" :hash="transaction.hash" :notCopiable="true" :customLabel="'See transaction'" /></span>
                                    </template>
                                    <template v-if="transaction.status == 'failed'">
                                        <v-icon style="vertical-align: text-bottom" size="small" class="mr-1" color="error">mdi-alert-circle</v-icon>
                                        <span class="text-error font-weight-bold">{{ transaction.text }} <Hash-Link :type="'transaction'" :hash="transaction.hash" :notCopiable="true" :customLabel="'See transaction'" /></span>
                                    </template>
                                </div>
                            </v-card-text>
                        </div>
                    </v-card>
                </v-col>
            </v-row>
        </template>
        <template v-else-if="isAdmin || isDemo">
            <Create-Explorer-Dex-Modal ref="createExplorerDexModal" />
            <v-card>
                <v-card-text>
                    <v-row>
                        <v-col align="center">
                            <v-icon style="opacity: 0.25;" size="200" color="primary-lighten-1">mdi-swap-horizontal</v-icon>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-spacer></v-spacer>
                        <v-col cols="6" class="text-body-1">
                            Ethernal comes with a built-in dex UI.<br>
                            Before setting it up, make sure you've already deployed the UniswapV2Router02 contract.<br>
                            Once it's done, you'll just need the contract address to continue.
                            <br><br>
                            By using this integrated dex, you won't have to build another UI from scratch, your token list will
                            always be synchronized, you'll have access to pool analytics right away, and your users will have everything
                            they need to interact with your chain in the same place.
                        </v-col>
                        <v-spacer></v-spacer>
                    </v-row>
                    <v-card-actions class="mb-4">
                        <v-spacer></v-spacer>
                        <v-btn @click="openCreateExplorerDexModal" variant="flat" :loading="loading" color="primary">Setup Now</v-btn>
                        <v-spacer></v-spacer>
                    </v-card-actions>
                </v-card-text>
            </v-card>
        </template>
        <template v-else>
            <v-card>
                <v-card-text>
                    <v-row>
                        <v-col align="center">
                            <v-icon style="opacity: 0.25;" size="200" color="primary-lighten-1">mdi-swap-horizontal</v-icon>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-spacer></v-spacer>
                        <v-col cols="6" class="text-body-1">
                            No dex has been setup here, but it's possible to!<br>
                            Reach out to the organization or individual that gave you access to this explorer and ask them to setup the dex on Ethernal.
                        </v-col>
                        <v-spacer></v-spacer>
                    </v-row>
                </v-card-text>
            </v-card>
        </template>
    </v-container>
</template>

<script>
import * as ethers from 'ethers';
import { storeToRefs } from 'pinia';
import { useExplorerStore } from '@/stores/explorer';
import { useWalletStore } from '@/stores/walletStore';
import { useEnvStore } from '@/stores/env';
import WalletConnectorMirror from './WalletConnectorMirror.vue';
import HashLink from './HashLink.vue';
import DexTokenSelectionModal from './DexTokenSelectionModal.vue';
import ExplorerDexParametersModal from './ExplorerDexParametersModal.vue';
import CreateExplorerDexModal from './CreateExplorerDexModal.vue';
import { BNtoSignificantDigits, debounce } from '@/lib/utils';
import { ERC20Connector, V2DexRouterConnector } from '@/lib/rpc';

const DEFAULT_DEX_PARAMETERS = {
    transactionTimeout: 60 * 20,
    slippageToleranceInBps: 50
};

const PRICE_IMPACT_SEVERITIES = {
    LOW: 1,
    MEDIUM: 3,
    HIGH: 5
};

export default{
    name: 'ExplorerDex',
    components: {
        DexTokenSelectionModal,
        ExplorerDexParametersModal,
        WalletConnectorMirror,
        HashLink,
        CreateExplorerDexModal
    },
    data: () => ({
        loading: false,
        errorMessage: null,
        router: null,
        tokens: [],
        sellAmount: null,
        sellToken: {},
        buyAmount: null,
        buyToken: {},
        dexParameters: {
            slippageToleranceInBps: 50,
            transactionTimeout: 60 * 20,
        },
        executionInfo: {
            minimumAmountOut: null,
            priceImpact: null,
            executionPrice: null,
            path: []
        },
        connectedAccount: null,
        provider: null,
        allowance: null,
        balances: {},
        refreshSellBalance: 0,
        displayInvertedPrice: false,
        transaction: {},
        loadingQuote: false,
        quoteDirection: 'exactIn',
        debouncedGetQuote: null,
        loadingTokens: false,
        pairCount: 0,
        totalPairs: 0,
        statusLoadingInterval: null,
        statusLoadingIntervalClear: false
    }),
    setup() {
        const { id, v2Dex, token, name, chainId, isDemo } = storeToRefs(useExplorerStore());
        const { connectedAddress } = storeToRefs(useWalletStore());
        const { nativeTokenAddress, isAdmin } = useEnvStore();

        return { v2Dex, token, nativeTokenAddress, explorerName: name, explorerChainId: chainId, connectedAddress, isDemo, explorerId: id, isAdmin };
    },
    mounted() {
        if (!this.v2Dex)
            return;
        this.loadTokens();
        this.provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
        this.initializeDexParameters();
    },
    methods: {
        formatEther: ethers.utils.formatEther,
        BNtoSignificantDigits,
        invert() {
            const amount = this.sellAmount;
            const token = this.sellToken;
            this.sellToken = this.buyToken;
            this.sellAmount = this.sellToken.address ? this.buyAmount : null;
            this.buyToken = token;
            this.
            buyAmount = this.buyToken.address ? amount : null;
        },
        loadStatus() {
            this.$server.getV2DexStatus(this.v2Dex.id)
                .then(({ data }) => {
                    this.pairCount = data.pairCount;
                    this.totalPairs = data.totalPairs;
                    if (this.pairCount < this.totalPairs) {
                        this.statusLoadingInterval = setTimeout(() => this.loadStatus(), 3000);
                    }
                    else if (this.statusLoadingIntervalClear) {
                        clearTimeout(this.statusLoadingInterval);
                    }
                    this.loadTokens();
                })
                .catch(console.log);
        },
        openCreateExplorerDexModal() {
            this.$refs.createExplorerDexModal.open({
                explorerId: this.explorerId,
                isDemo: this.isDemo
            })
            .then(v2Dex => {
                if (v2Dex) {
                    const explorerStore = useExplorerStore();
                    explorerStore.updateExplorer({ v2Dex });
                    if (!this.isDemo)
                        this.loadStatus();
                    this.initializeDexParameters();
                }
            })
        },
        selectionChanged() {
            if (!this.quotable)
                return this.executionInfo = {};

            const amount = this.quoteDirection == 'exactIn' ? this.amountIn : this.amountOut;
            if (!amount)
                return this.executionInfo = {};

            this.loadingQuote = true;

            if (!this.debouncedGetQuote)
                this.debouncedGetQuote = debounce(amount => {
                    this.$server.getV2DexQuote(this.sellToken.address, this.buyToken.address, amount, this.quoteDirection, this.dexParameters.slippageToleranceInBps)
                        .then(({ data: { quote }}) => {
                            if (this.quoteDirection == 'exactIn' && this.amountIn != amount || this.quoteDirection == 'exactOut' && this.amountOut != amount)
                                return this.executionInfo = {};
                            const quoteEntries = Object.entries(quote);
                            if (!quoteEntries.length)
                                return this.executionInfo = quote;
                            quoteEntries.forEach(([k, v]) => this.executionInfo[k] = v);
                            if (this.quoteDirection == 'exactIn')
                                this.buyAmount = this.executionInfo.outputAmount;
                            else
                                this.sellAmount = this.executionInfo.inputAmount;
                        })
                        .catch(console.log)
                        .finally(() => this.loadingQuote = false);
                }, 300);

            this.debouncedGetQuote(amount);
        },
        checkAllowance() {
            const erc20Connector = new ERC20Connector({ provider: this.provider, address: this.sellToken.address, from: this.connectedAccount });
            return erc20Connector
                .allowance(this.v2Dex.routerAddress)
                .then(data => this.allowance = ethers.BigNumber.from(data))
                .catch(console.log);
        },
        approve() {
            this.transaction = {
                status: 'loading',
                text: 'Sending transaction...'
            };
            this.errorMessage = null;
            const erc20Connector = new ERC20Connector({ provider: this.provider, address: this.sellToken.address, from: this.connectedAccount });
            erc20Connector
                .approve(this.v2Dex.routerAddress, ethers.utils.parseUnits(this.sellAmount, 'ether'))
                .then(transaction => this.waitForTransaction(transaction, 'Approval successful. You can now swap your token.', 'Approval failed.'))
                .catch(error => {
                    this.errorMessage = `Error: ${error.reason}`;
                    this.transaction = {};
                });
        },
        async waitForTransaction(transaction, successMessage, errorMessage) {
            this.transaction = {
                status: 'loading',
                text: 'Waiting for receipt...'
            }

            const receipt = await transaction.wait();
            if (receipt.status == 1) {
                await this.checkAllowance()
                this.transaction = { status: 'success', text: successMessage, hash: receipt.transactionHash };
            }
            else
                this.transaction = { status: 'failed', text: errorMessage, hash: receipt.transactionHash };
        },
        swap() {
            this.errorMessage = null;
            if (this.executionInfo.priceImpact >= PRICE_IMPACT_SEVERITIES.HIGH)
                if (!confirm(`This swap will have a high price impact on the traded assets (${this.executionInfo.priceImpact}%). Are you sure you want to proceed?`))
                    return;

            const path = this.executionInfo.path.map(t => t.address);
            const amountIn = ethers.utils.parseEther(this.sellAmount);
            const amountInMax = ethers.utils.parseEther(this.executionInfo.maximumAmountIn);
            const amountOut = ethers.utils.parseEther(this.executionInfo.outputAmount);
            const amountOutMin = ethers.utils.parseEther(this.executionInfo.minimumAmountOut);
            const deadline = Math.floor(new Date() / 1000) + this.dexParameters.transactionTimeout;

            const routerConnector = new V2DexRouterConnector({ provider: this.provider, address: this.v2Dex.routerAddress, from: this.connectedAccount });
            let swapFn;

            if (this.sellToken.address.toLowerCase() == this.nativeTokenAddress.toLowerCase())
                if (this.quoteDirection == 'exactIn')
                    swapFn = routerConnector.swapExactETHForTokens(amountIn, amountOutMin, path, this.connectedAccount, deadline);
                else
                    swapFn = routerConnector.swapETHForExactTokens(amountInMax, amountOut, path, this.connectedAccount, deadline);
            else
                if (this.quoteDirection == 'exactIn')
                    swapFn = routerConnector.swapExactTokensForTokens(amountIn, amountOutMin, path, this.connectedAccount, deadline);
                else
                    swapFn = routerConnector.swapTokensForExactTokens(amountOut, amountInMax, path, this.connectedAccount, deadline);

            swapFn.then(transaction => this.waitForTransaction(transaction, 'Swap successful.', 'Swap failed.'))
                .catch(error => {
                    this.errorMessage = `Error: ${error.reason}`;
                    this.transaction = {}
                });
        },
        loadTokens() {
            const nativeToken = {
                address: this.nativeTokenAddress,
                tokenSymbol: this.token || 'ETH',
                tokenName: this.token || 'Ether'
            };
            this.loadingTokens = true;
            this.tokens = [nativeToken];
            this.$server.getV2DexTokens()
                .then(({ data: { tokens }}) => {
                    this.tokens = [nativeToken, ...tokens];

                    if (this.tokens.length)
                        this.sellToken = this.tokens[0];
                })
                .catch(console.log)
                .finally(() => this.loadingTokens = false);
        },
        loadBalances() {
            this.$server.getTokenBalances(this.connectedAccount, ['erc20'])
                .then(({ data: balances }) => {
                    balances.forEach(b => this.balances[b.tokenContract.address] = b.currentBalance || '0');
                });
            this.$server.getNativeTokenBalance(this.connectedAccount)
                .then(({ data: { balance } }) => this.balances[this.nativeTokenAddress] = balance);
        },
        onRpcConnectionStatusChanged(data) {
            this.connectedAccount = data.account;
            if (this.connectedAccount)
                this.loadBalances();
        },
        openSellTokenSelectionModal() {
            this.$refs.dexTokenSelectionModal.open({
                oppositeTokenAddress: this.buyToken.address,
                tokens: this.tokens,
                balances: this.balances
            })
            .then(token => {
                this.sellToken = token;
                if (this.buyToken.address == this.sellToken.address)
                    this.buyToken = {};
            });
        },
        openBuyTokenSelectionModal() {
            this.$refs.dexTokenSelectionModal.open({
                oppositeTokenAddress: this.sellToken.address,
                tokens: this.tokens,
                balances: this.balances
            })
            .then(token => {
                this.buyToken = token;
                if (this.sellToken.address == this.buyToken.address)
                    this.sellToken = {};
            });
        },
        openExplorerDexParametersModal() {
            this.$refs.explorerDexParametersModal.open(this.dexParameters);
        },
        balanceOf(address) {
            return this.balances[address] || '0';
        },
        initializeDexParameters() {
            try {
                this.dexParameters = JSON.parse(localStorage.getItem('dexParameters')) || DEFAULT_DEX_PARAMETERS;
            } catch(error) {
                console.log(error);
                this.dexParameters = DEFAULT_DEX_PARAMETERS;
            }
        },
        dexParametersChanged(newParameters) {
            localStorage.setItem('dexParameters', JSON.stringify(newParameters));
            if (newParameters.slippageToleranceInBps != this.dexParameters.slippageToleranceInBps) {
                this.dexParameters = newParameters;
                this.selectionChanged();
            }
            else
                this.dexParameters = newParameters;
        },
        isValidAmount(amount) {
            if (ethers.BigNumber.isBigNumber(amount))
                return amount.gt(0);
            return amount && parseFloat(amount) > 0;
        }
    },
    watch: {
        buyAmount() {
            if (this.quoteDirection == 'exactOut')
                this.selectionChanged()
        },
        sellAmount() {
            if (this.quoteDirection == 'exactIn')
                this.selectionChanged()
        },
        buyToken() { this.selectionChanged() },
        sellToken() {
            if (this.connectedAccount)
                this.checkAllowance();
            this.selectionChanged();
        }
    },
    computed: {
        priceImpactSeverityClass() {
            const parsedImpact = parseFloat(this.executionInfo.priceImpact);
            if (parsedImpact <= PRICE_IMPACT_SEVERITIES.LOW) return 'success--text';
            else if (parsedImpact <= PRICE_IMPACT_SEVERITIES.MEDIUM) return 'warning--text';
            else return 'error--text';
        },
        formattedPriceImpact() {
            if (!this.executionInfo.priceImpact)
                return null;
            if (parseFloat(this.executionInfo.priceImpact) < 0.01)
                return '<0.01';
            return this.executionInfo.priceImpact;
        },
        invertedPriceText() {
            if (!this.validCombination)
                return null;

            return `${this.executionInfo.invertedExecutionPrice} ${this.buyToken.tokenSymbol} per ${this.sellToken.tokenSymbol}`;
        },
        priceText() {
            if (!this.validCombination)
                return null;

            return `${this.executionInfo.executionPrice} ${this.sellToken.tokenSymbol} per ${this.buyToken.tokenSymbol}`;
        },
        validCombination() {
            return !!this.executionInfo.executionPrice;
        },
        swapButtonDisabled() {
            return !this.quotable || this.needsApproval || !this.validCombination || this.loadingQuote || !this.sufficientBalance;
        },
        sufficientBalance() {
            return ethers.utils.parseEther(this.sellAmount).lte(this.balanceOf(this.sellToken.address));
        },
        validExactIn() {
            return this.quoteDirection == 'exactIn' && this.sellAmount && this.sellToken.address;
        },
        validExactOut() {
            return this.quoteDirection == 'exactOut' && this.buyAmount && this.buyToken.address;
        },
        swapButtonText() {
            if (!this.validExactIn && !this.validExactOut)
                return 'Enter an amount';
            else if (!this.isValidAmount(this.amountIn) && !this.isValidAmount(this.amountOut))
                return 'Invalid amount';
            else if (!this.sufficientBalance)
                return 'Insufficient balance';
            else if (!this.buyToken.address || !this.sellToken.address)
                return 'Select a token';
            else if (this.loadingQuote)
                return 'Getting quote...';
            else if (!this.validCombination)
                return 'Swap not supported';

            return 'Swap';
        },
        quotable() {
            return (this.validExactIn || this.validExactOut) && this.sellToken.address && this.buyToken.address;
        },
        needsApproval() {
            if (!this.sellAmount || !this.allowance || !this.sufficientBalance)
                return false;
            if (this.sellToken.address.toLowerCase() == this.nativeTokenAddress.toLowerCase())
                return false;
            return this.quotable && this.allowance && ethers.utils.parseUnits(this.sellAmount, 'ether').gt(this.allowance);
        },
        amountIn() {
            if (!this.sellAmount)
                return null;
            return ethers.utils.parseUnits(this.sellAmount, 'ether').toString();
        },
        amountOut() {
            if (!this.buyAmount)
                return null;
            return ethers.utils.parseUnits(this.buyAmount, 'ether').toString();
        },
        chainId() {
            return parseInt(this.explorerChainId);
        }
    }
}
</script>
<style scoped>
.swap {
    font-size: 1.2em;
}
.large-text :deep(input) {
    font-size: 1.75em !important;
}
.balance {
    font-size: 75%;
    display: block;
    color: black;
    font-weight: 500;
}
.swap-extra-info {
    font-weight: 500;
}
.tokenSelector {
  text-transform: initial;
}
.tokenSelectorModal {
    border-radius: 1.5rem;
}
/deep/ .v-field__field {
    align-items: inherit;
}
</style>
