<template>
    <div v-if="data.length > 1" class="chart">
        <LineChartGenerator
            :chart-options="{ responsive: true, maintainAspectRatio: false }"
            :chart-data="{ labels: xLabels, datasets: [{ data }]}"
            :chart-id="'line-chart'"
            :dataset-id-key="'transactionVolume'"
            :plugins="[]"
        />
    </div>
</template>
<script>
import { Line as LineChartGenerator } from 'vue-chartjs/legacy';
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    LineElement,
    LinearScale,
    CategoryScale,
    PointElement
} from 'chart.js';

ChartJS.register(
    Title,
    Tooltip,
    Legend,
    LineElement,
    LinearScale,
    CategoryScale,
    PointElement
);

const moment = require('moment');

export default {
    name: 'LineChart',
    props: ['xLabels', 'data', 'tooltipUnit', 'tokenSymbol'],
    components: {
        LineChartGenerator
    },
    data: () => ({
        chartData: {

        }
    }),
    mounted() {},
    methods: {
        moment: moment,
        onMouseMove(hovered) {
            this.tooltipData = hovered;
            if (hovered)
                this.$refs.tooltip.setAttribute('data-show', '');
            else
                this.$refs.tooltip.removeAttribute('data-show');
            this.popper.update();
        }
    },
    computed: {
        formattedTooltipUnit() {
            if (this.tokenSymbol)
                return this.tokenSymbol;

            if (this.data && this.tooltipData && this.tooltipData.index)
                return parseInt(this.data[this.tooltipData.index]) != 1 ? `${this.tooltipUnit}s` : this.tooltipUnit;
            else
                return this.tooltipUnit;
        }
    }
}
</script>
<style lang="scss">
</style>
