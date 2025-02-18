<template>
    <v-card class="px-1" v-if="data">
        <template v-slot:subtitle>
            <v-row>
                <v-col cols="2" :align="'end'" v-if="isZoomed">
                    <v-tooltip location="top">
                        <template v-slot:activator="{ props }">
                            <v-spacer />
                            <v-btn v-bind="props" color="primary" dense variant="outlined" @click="resetZoom()" size="small"><v-icon size="small">mdi-restore</v-icon></v-btn>
                        </template>
                        Reset Zoom
                    </v-tooltip>
                </v-col>
            </v-row>
        </template>
        <div v-if="data">
            <LineChartGenerator
                ref="chart"
                :style="styles"
                :options="options"
                :data="{ labels: xLabels, datasets: data }"
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
import zoomPlugin from 'chartjs-plugin-zoom';
import {
    Chart as ChartJS,
    Tooltip,
    LineElement,
    LinearScale,
    CategoryScale,
    PointElement,
    Legend
} from 'chart.js';
import { Line as LineChartGenerator } from 'vue-chartjs';

ChartJS.register(
    Tooltip,
    LineElement,
    LinearScale,
    CategoryScale,
    PointElement,
    Legend,
    zoomPlugin
);

import { hex2rgba } from '@/lib/utils';

const DATE_FORMAT = 'MM/DD';

export default {
    name: 'MultiLineChart',
    props: ['xLabels', 'data', 'tooltipUnit', 'tokenSymbol', 'floating'],
    components: {
        LineChartGenerator
    },
    data: () => ({
        plugins: [],
        isZoomed: false
    }),
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
                    tooltipUnit: this.tooltipUnit
                },
                responsive: true,
                maintainAspectRatio: false,
                borderColor: theme.current.value.colors.primary,
                borderWidth: 2,
                pointRadius: 0,
                interaction: {
                    intersect: false
                },
                spanGaps: true,
                backgroundColor: hex2rgba(theme.current.value.colors.primary, 0.2),
                elements: {
                    line: {
                        cubicInterpolationMode: 'monotone'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grace: '15%',
                        suggestedMax: this.floating ? null : 5,
                        grid: {
                            drawBorder: false,
                            color: hex2rgba(theme.current.value.colors.primary, 0.6)
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
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxHeight: 1
                        }
                    },
                    tooltip: {
                        backgroundColor: theme.current.value.colors.primary,
                        displayColors: false,
                        enabled: true,
                        bodyFont: { weight: 'bold' },
                        filter: (_tooltipItems, idx) => {
                            return idx === 0;
                        },
                        callbacks: {
                            title() { return '' },
                            label: (context) => {
                                const avgValue = context.parsed.y < 1 ? context.parsed.y : ethers.utils.commify(context.parsed.y);
                                const minValue = context.dataset.min[context.dataIndex] < 1 ? context.dataset.min[context.dataIndex] : ethers.utils.commify(context.dataset.min[context.dataIndex]);
                                const maxValue = context.dataset.max[context.dataIndex] < 1 ? context.dataset.max[context.dataIndex] : ethers.utils.commify(context.dataset.max[context.dataIndex]);
                                return [
                                    `Max: ${maxValue} ${this.tokenSymbol}`,
                                    `Avg: ${avgValue} ${this.tokenSymbol}`,
                                    `Min: ${minValue} ${this.tokenSymbol}`
                                ]
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
