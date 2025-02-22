<template>
    <v-card class="px-1" v-if="data">
        <template v-slot:subtitle>
            <v-row>
                <v-col cols="10">{{ title }}</v-col>
                <v-col cols="2" :align="'end'" v-if="isZoomed">
                    <v-btn v-tooltip="'Reset Zoom'" color="primary" dense variant="outlined" @click="resetZoom()" size="small"><v-icon size="small">mdi-restore</v-icon></v-btn>
                </v-col>
            </v-row>
        </template>
        <div v-if="data">
            <LineChartGenerator
                ref="chart"
                :style="styles"
                :options="options"
                :data="{ labels: xLabels, datasets: [{ data }]}"
                :chart-id="'line-chart'"
                :plugins="plugins"
            />
        </div>
    </v-card>
    <v-skeleton-loader v-else type="card"></v-skeleton-loader>
</template>
<script>
const moment = require('moment');
const ethers = require('ethers');
import { useTheme } from 'vuetify';
import { Line as LineChartGenerator } from 'vue-chartjs';
import zoomPlugin from 'chartjs-plugin-zoom';
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    LineElement,
    LinearScale,
    CategoryScale,
    PointElement,
    Filler,
    Legend
} from 'chart.js';

ChartJS.register(
    Title,
    Tooltip,
    LineElement,
    LinearScale,
    CategoryScale,
    PointElement,
    Filler,
    Legend,
    zoomPlugin
);

import { hex2rgba } from '@/lib/utils';

const DATE_FORMAT = 'MM/DD';

export default {
    name: 'LineChart',
    props: ['title', 'xLabels', 'data', 'tooltipUnit', 'tokenSymbol', 'floating', 'yAxisSymbol'],
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
            this.$refs.chart.chart.resetZoom();
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
            const theme = useTheme();

            return {
                extra: {
                    tokenSymbol: this.tokenSymbol,
                    tooltipUnit: this.tooltipUnit,
                },
                responsive: true,
                maintainAspectRatio: false,
                borderColor: theme.current.value.colors.primary,
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
                    color: theme.current.value.colors.primary
                },
                backgroundColor: hex2rgba(theme.current.value.colors.primary, 0.2),
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
                            color: hex2rgba(theme.current.value.colors.primary, 0.6)
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            precision: this.floating ? null : 0,
                            autoSkip: false,
                            maxTicksLimit: 6,
                            callback: (value) => {
                                return this.yAxisSymbol ? `${value}${this.yAxisSymbol}` : value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            callback: (_value, index) => {
                                return moment(this.xLabels[index]).format(DATE_FORMAT);
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: theme.current.value.colors.primary,
                        displayColors: false,
                        enabled: true,
                        intersect: false,
                        mode: 'index',
                        bodyFont: { weight: 'bold' },
                        callbacks: {
                            title() { return '' },
                            label: (context) => {
                                const value = context.parsed.y < 1 ? context.parsed.y : ethers.utils.commify(context.parsed.y);
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
