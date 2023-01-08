<template>
    <v-container fluid>
        <v-row>
            <v-col cols="12" md="6">
                <v-card outlined class="px-1">
                    <v-card-subtitle>Transfer Volume (14 Days) - UTC Time</v-card-subtitle>
                    <Line-Chart v-if="!transferVolumeLoading && transferVolume.data" :xLabels="transferVolume.xLabels" :data="transferVolume.data" :tooltipUnit="'transfer'" :index="0" />
                    <v-skeleton-loader v-else type="image" class="pa-2"></v-skeleton-loader>
                </v-card>
            </v-col>

            <v-col cols="12" md="6">
                <v-card outlined class="px-1">
                    <v-card-subtitle>Circulating Supply (14 Days) - UTC Time</v-card-subtitle>
                    <Line-Chart v-if="!cumulativeSupplyLoading && cumulativeSupply.data" :xLabels="cumulativeSupply.xLabels" :data="cumulativeSupply.data" :tokenSymbol="tokenSymbol" :index="0" />
                    <v-skeleton-loader v-else type="image" class="pa-2"></v-skeleton-loader>
                </v-card>
            </v-col>

            <v-col cols="12" md="6">
                <v-card outlined class="px-1">
                    <v-card-subtitle>Holder Count (14 Days) - UTC Time</v-card-subtitle>
                    <Line-Chart v-if="!holderHistoryLoading && holderHistory.data" :xLabels="holderHistory.xLabels" :data="holderHistory.data" :tooltipUnit="'holder'" :index="0" />
                    <v-skeleton-loader v-else type="image" class="pa-2"></v-skeleton-loader>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
const moment = require('moment');
const ethers = require('ethers');
import LineChart from './LineChart';

export default {
    name: 'ERC20ContractAnalytics',
    props: ['address', 'tokenDecimals', 'tokenSymbol'],
    components: {
        LineChart
    },
    data: () => ({
        transferVolumeLoading: true,
        cumulativeSupplyLoading: true,
        holderHistoryLoading: true,
        transferVolume: {},
        cumulativeSupply: {},
        holderHistory: {}
    }),
    mounted() {
    },
    methods: {
        from: ethers.BigNumber.from,
        formatUnits: ethers.utils.formatUnits,
        moment: moment
    },
    watch: {
        address: {
            immediate: true,
            handler(address) {
                const date14daysAgo = moment().subtract(14, 'days').format('YYYY-MM-DD');
                const dateNow = moment().format('YYYY-MM-DD');

                this.server.getErc20ContractTransferVolume(address, date14daysAgo, dateNow)
                    .then(({ data }) => {
                        this.transferVolume = {
                            xLabels: data.map(t => moment(t.timestamp).format('DD/MM')),
                            data: data.map(t => parseInt(t.count))
                        }
                    })
                    .catch(console.log)
                    .finally(() => this.transferVolumeLoading = false);

                this.server.getErc20ContractCumulativeSupply(address, date14daysAgo, dateNow)
                    .then(({ data }) => {
                        this.cumulativeSupply = {
                            xLabels: data.map(t => moment(t.timestamp).format('DD/MM')),
                            data: data.map(t => parseFloat(this.formatUnits(this.from(t.cumulativeSupply), this.tokenDecimals)))
                        }
                    })
                    .catch(console.log)
                    .finally(() => this.cumulativeSupplyLoading = false);

                this.server.getErc20TokenHolderHistory(address, date14daysAgo, dateNow)
                    .then(({ data }) => {
                        this.holderHistory = {
                            xLabels: data.map(t => moment(t.timestamp).format('DD/MM')),
                            data: data.map(t => parseInt(t.count))
                        }
                    })
                    .catch(console.log)
                    .finally(() => this.holderHistoryLoading = false);
            }
        }
    },
}
</script>
