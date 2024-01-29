<template>
    <v-container fluid>
        <v-row>
            <v-col cols="12" md="6">
                <v-card outlined class="px-1">
                    <v-card-subtitle>Daily Transaction Volume</v-card-subtitle>
                    <Line-Chart :xLabels="transactionVolume.xLabels" :data="transactionVolume.data" :tooltipUnit="'transaction'" :index="0" />
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
    name: 'ExplorerAnalytics',
    props: ['id'],
    components: {
        LineChart
    },
    data: () => ({
        transactionVolumeLoading: true,
        cumulativeSupplyLoading: true,
        holderHistoryLoading: true,
        charts: {},
        transactionVolume: {},
        cumulativeSupply: {},
        holderHistory: {}
    }),
    mounted() {
        const from = new Date(new Date() - 14 * 24 * 3600 * 1000);
        const to = new Date(new Date() - 24 * 3600 * 1000);
        this.server.getTransactionVolume(from, to)
            .then(({ data }) => {
                this.transactionVolume = {
                    xLabels: data.map(t => moment(t.date).format('DD/MM')),
                    data: data.map(t => parseInt(t.count))
                };
            })
            .catch(console.log)
            .finally(() => this.transactionVolumeLoading = false);
    },
    methods: {
        from: ethers.BigNumber.from,
        formatUnits: ethers.utils.formatUnits,
        moment: moment
    },
}
</script>
