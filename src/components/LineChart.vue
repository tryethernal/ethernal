<template>
    <div v-if="data">
        <a href="#" @click="resetZoom()">Reset Zoom</a>
        <LineChartGenerator
            ref="chart"
            @onZoom="isZoomed = true"
            :chart-options="options"
            :chart-data="{ labels: xLabels, datasets: [{ data }]}"
            :chart-id="'line-chart'"
            :dataset-id-key="'transactionVolume'"
            :plugins="plugins"
        />
    </div>
</template>
<script>
import { Line as LineChartGenerator } from 'vue-chartjs/legacy';
import zoomPlugin from 'chartjs-plugin-zoom';
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    LineElement,
    LinearScale,
    CategoryScale,
    PointElement,
    Filler
} from 'chart.js';

ChartJS.register(
    Title,
    Tooltip,
    LineElement,
    LinearScale,
    CategoryScale,
    PointElement,
    Filler,
    zoomPlugin
);

const { hex2rgba } = require('@/lib/utils');

export default {
    name: 'LineChart',
    props: ['xLabels', 'data', 'tooltipUnit', 'tokenSymbol'],
    components: {
        LineChartGenerator
    },
    data: () => ({
        plugins: [],
        isZoomed: false
    }),
    mounted() {
        // Adapted from https://codepen.io/kurkle/pen/KKVgQXV
        this.plugins.push({
            id: 'mouseLine',
            afterEvent: function (chart, e) {
                const chartArea = chart.chartArea;
                if (
                    e.event.x >= chartArea.left &&
                    e.event.y >= chartArea.top &&
                    e.event.x <= chartArea.right &&
                    e.event.y <= chartArea.bottom
                    && chart._active.length
                ) {
                    chart.options.mouseLine.x = chart._active[0].element.x;
                } else {
                    chart.options.mouseLine.x = NaN;
                }
            },
            afterDraw: function (chart) {
                const ctx = chart.ctx;
                const chartArea = chart.chartArea;
                const x = chart.options.mouseLine.x;
                if (!isNaN(x)) {
                    ctx.save();
                    ctx.strokeStyle = chart.options.mouseLine.color;
                    ctx.lineWidth = 1
                    ctx.moveTo(chart.options.mouseLine.x, chartArea.bottom);
                    ctx.lineTo(chart.options.mouseLine.x, chartArea.top);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        });
    },
    methods: {
        hex2rgba,
        resetZoom() {
            this.$refs.chart.getCurrentChart().resetZoom();
        },
    },
    computed: {
        formattedTooltipUnit() {
            if (this.tokenSymbol)
                return this.tokenSymbol;

            if (this.data && this.tooltipData && this.tooltipData.index)
                return parseInt(this.data[this.tooltipData.index]) != 1 ? `${this.tooltipUnit}s` : this.tooltipUnit;
            else
                return this.tooltipUnit;
        },
        options() {
            return {
                extra: {
                    tokenSymbol: this.tokenSymbol,
                    tooltipUnit: this.tooltipUnit
                },
                maintainAspectRatio: false,
                borderColor: this.$vuetify.theme.themes.light.primary,
                borderWidth: 1,
                pointRadius: 0,
                interaction: {
                    intersect: false
                },
                hover: {
                    mode: 'index',
                    intersect: false
                },
                spanGaps: true,
                mouseLine: {
                    color: this.$vuetify.theme.themes.light.primary
                },
                backgroundColor: hex2rgba(this.$vuetify.theme.themes.light.primary, 0.2),
                elements: {
                    line: {
                        cubicInterpolationMode: 'monotone',
                        fill: true
                    }
                },
                scales: {
                    y: {
                        grid: {
                            drawBorder: false,
                            color: hex2rgba(this.$vuetify.theme.themes.light.primary, 0.8)
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                    }
                },
                plugins: {
                    tooltip: {
                        backgroundColor: this.$vuetify.theme.themes.light.primary,
                        displayColors: false,
                        enabled: true,
                        intersect: false,
                        mode: 'index',
                        bodyFont: { weight: 'bold' },
                        callbacks: {
                            title() {},
                            label: (context) => {
                                const value = context.parsed.y;
                                const date = this.xLabels[context.parsed.x];
                                if (this.tokenSymbol)
                                    return `${date} - ${value}  ${this.tokenSymbol}`;
                                else {
                                    const unitString = parseInt(value) > 1 ? `${this.tooltipUnit}s` : this.tooltipUnit;
                                    return `${date} - ${value} ${unitString}`;
                                }
                            }
                        }
                    },
                    zoom: {
                        zoom: {
                            drag: { enabled: true },
                            mode: 'x'
                        }
                    }
                }
            }
        }
    }
}
</script>
<style lang="scss">
</style>
