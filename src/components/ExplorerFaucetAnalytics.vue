<template>
    <v-card outlined>
        <v-card-text>
            <v-row>
                <v-col cols="3" class="pb-0">
                    <v-select @change="initAllCharts" hide-details="true" dense primary outlined label="Time Range" :items="ranges" v-model="selectedTimeRange" item-text="label" item-value="value">
                    </v-select>
                </v-col>
            </v-row>
            <v-row>
                <v-col>
                    <Line-Chart :title="'Request Volume'" :xLabels="charts['requestVolume'].xLabels" :data="charts['requestVolume'].data" :tooltipUnit="'request'" :index="0" />
                </v-col>
                <v-col>
                    <Line-Chart :title="'Token Volume'" :xLabels="charts['tokenVolume'].xLabels" :data="charts['tokenVolume'].data" :tooltipUnit="publicExplorer.token || 'ETH'" :floating="true" :index="1" />
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script>
const moment = require('moment');
import { mapGetters } from 'vuex';
import LineChart from './LineChart';

export default {
    name: 'ExplorerFaucetAnalytics',
    props: ['id'],
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
            requestVolume: {},
            tokenVolume: {}
        },
    }),
    mounted() {
       this.initAllCharts();
    },
    methods: {
        moment,
        initAllCharts() {
            this.getRequestVolume();
            this.getTokenVolume();
        },
        getRequestVolume() {
            this.server.getFaucetRequestVolume(this.id, this.from, this.to)
                .then(({ data }) => {
                    this.charts['requestVolume'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseInt(t.count))
                    };
                })
                .catch(console.log);
        },
        getTokenVolume() {
            this.server.getFaucetTokenVolume(this.id, this.from, this.to)
                .then(({ data }) => {
                    this.charts['tokenVolume'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseFloat(t.amount))
                    };
                })
                .catch(console.log);
        }
    },
    computed: {
        ...mapGetters([
            'publicExplorer'
        ]),
        from() {
            return this.selectedTimeRange > 0 ? new Date(new Date() - this.selectedTimeRange * 24 * 3600 * 1000) : new Date(0);
        },
        to() {
            return new Date();
        }
    }
}
</script>
