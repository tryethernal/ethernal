<template>
    <v-card outlined class="px-1" v-if="data">
        <v-card-subtitle>
            <v-row>
                <v-col cols="10">{{ title }}</v-col>
                <v-col cols="2" :align="'end'" v-if="isZoomed">
                    <v-tooltip top>
                        <template v-slot:activator="{ on, attrs }">
                            <v-btn v-bind="attrs" v-on="on" color="primary" dense outlined @click="resetZoom()" small><v-icon small>mdi-restore</v-icon></v-btn>
                        </template>
                        Reset Zoom
                    </v-tooltip>
                </v-col>
            </v-row>
        </v-card-subtitle>
        <div v-if="data">
            <LineChartGenerator
                ref="chart"
                :style="styles"
                :chart-options="options"
                :chart-data="{ labels: xLabels, datasets: [{ data }]}"
                :chart-id="'line-chart'"
                :dataset-id-key="'transactionVolume'"
                :plugins="plugins"
            />
        </div>
    </v-card>
    <v-skeleton-loader v-else type="card"></v-skeleton-loader>
</template>
<script>
const moment = require('moment');
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

const DATE_FORMAT = 'MM/DD';

export default {
    name: 'LineChart',
    props: ['title', 'xLabels', 'data', 'tooltipUnit', 'tokenSymbol', 'floating'],
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
            this.isZoomed = false;
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
        styles() {
            return {
                height: '200px'
            }
        },
        options() {
            return {
                extra: {
                    tokenSymbol: this.tokenSymbol,
                    tooltipUnit: this.tooltipUnit
                },
                responsive: true,
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
                        beginAtZero: true,
                        grace: '15%',
                        suggestedMax: this.floating ? null : 5,
                        grid: {
                            drawBorder: false,
                            color: hex2rgba(this.$vuetify.theme.themes.light.primary, 0.6)
                        },
                        ticks: {
                            precision: this.floating ? null : 0,
                            autoSkip: false,
                            maxTicksLimit: 6
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            callback: (_value, index) => {
                                return moment(this.xLabels[index]).format(DATE_FORMAT);
                            }
                        }
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
                                const date = moment(this.xLabels[context.parsed.x]).format(DATE_FORMAT);
                                if (this.tokenSymbol)
                                    return `${date} - ${value} ${this.tokenSymbol}`;
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
                            mode: 'x',
                            onZoomComplete: () => {
                                this.isZoomed = true;
                            }
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
