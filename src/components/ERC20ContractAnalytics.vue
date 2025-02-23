<template>
    <v-container fluid>
        <v-row>
            <v-col cols="3" class="pb-0">
                <v-select @update:model-value="initAllCharts()" hide-details="true" density="compact" color="primary" variant="outlined" label="Time Range" :items="ranges" v-model="selectedTimeRange" item-title="label" item-value="value">
                </v-select>
            </v-col>
        </v-row>
        <v-row>
            <v-col cols="12" md="6">
                <Line-Chart :title="'Transfer Volume'" :xLabels="charts['transferVolume'].xLabels" :data="charts['transferVolume'].data" :tooltipUnit="'transfer'" :index="1" />
            </v-col>

            <v-col cols="12" md="6">
                <Line-Chart :title="'Circulating Supply'" :xLabels="charts['circulatingSupply'].xLabels" :data="charts['circulatingSupply'].data" :tokenSymbol="tokenSymbol" :index="2" />
            </v-col>

            <v-col cols="12" md="6">
                <Line-Chart :title="'Token Holder History'" :xLabels="charts['tokenHolderHistory'].xLabels" :data="charts['tokenHolderHistory'].data" :tooltipUnit="'holder'" :index="3" />
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
const moment = require('moment');
const ethers = require('ethers');
import LineChart from './LineChart.vue';

export default {
    name: 'ERC20ContractAnalytics',
    props: ['address', 'tokenDecimals', 'tokenSymbol', 'tokenType'],
    components: {
        LineChart
    },
    data: () => ({
        selectedTimeRange: 14,
        ranges: [
            { label: '14 Days', value: 14 },
            { label: '30 Days', value: 30 },
            { label: 'All Time', value: 0 }
        ],
        charts: {
            transferVolume: {},
            circulatingSupply: {},
            tokenHolderHistory: {}
        },
    }),
    methods: {
        formatUnits: ethers.utils.formatUnits,
        moment: moment,
        initAllCharts(address) {
            this.getTransferVolume(address || this.address);
            this.getCirculatingSupply(address || this.address);
            this.getTokenHolderHistory(address || this.address);
        },
        getTransferVolume(address) {
            this.$server.getTokenTransferVolume(this.from, this.to, address)
                .then(({ data }) => {
                    this.charts['transferVolume'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseInt(t.count))
                    };
                })
                .catch(console.log);
        },
        getCirculatingSupply(address) {
            this.$server.getTokenCirculatingSupply(this.from, this.to, address)
                .then(({ data }) => {
                    this.charts['circulatingSupply'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => {
                            if (this.tokenType == 'erc20')
                                return parseFloat(ethers.utils.formatUnits(ethers.BigNumber.from(t.amount), this.tokenDecimals || 'ether'))
                            else
                                return t.amount;
                        })
                    };
                })
                .catch(console.log);
        },
        getTokenHolderHistory(address) {
            this.$server.getTokenHolderHistory(this.from, this.to, address)
                .then(({ data }) => {
                    this.charts['tokenHolderHistory'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => t.count)
                    };
                })
                .catch(console.log);
        }
    },
    watch: {
        address: {
            immediate: true,
            handler(address) {
                this.initAllCharts(address);
            }
        }
    },
    computed: {
        from() {
            return this.selectedTimeRange > 0 ? new Date(new Date() - this.selectedTimeRange * 24 * 3600 * 1000) : new Date(0);
        },
        to() {
            return new Date();
        }
    }
}
</script>
