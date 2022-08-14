<template>
<div>
    <div v-if="data.length > 1" class="chart">
        <div id="tooltip" role="tooltip" ref="tooltip">
            <template v-if="tooltipData">
                {{ this.xLabels[tooltipData.index] }} - {{ parseInt(this.data[tooltipData.index]).toLocaleString() }} {{ formattedTooltipUnit }}
            </template>
            <div id="arrow" data-popper-arrow></div>
        </div>
        <TrendChart
            ref="chart"
            class="trend-chart"
            @mouse-move="onMouseMove"
            :interactive="true"
            :datasets="[
                {
                    data: data,
                    smooth: true,
                    fill: true,
                    className: 'curve'
                }
            ]"
            :grid="{
                verticalLines: false,
                horizontalLines: true
            }"
            :labels="{
                xLabels: xLabels,
                yLabels: 5,
                yLabelsTextFormatter: val => parseInt(val).toLocaleString()
            }"
            :min="0">
        </TrendChart>
    </div>
    <div v-else class="disabled-chart-container">
        <h6 class="disabled-chart-title">Not enough data to display graph.</h6>
        <TrendChart
            class="disabled-chart"
            :datasets="[
                {
                    data: [500, 10000, 5000],
                    smooth: true,
                    fill: true,
                    className: 'curve'
                }
            ]"
            :grid="{
                verticalLines: false,
                horizontalLines: true
            }"
            :labels="{
                xLabels: ['09/01', '09/02', '09/03'],
                yLabels: 3,
            }"
            :min="0"></TrendChart>
    </div>
</div>
</template>
<script>
import Vue from 'vue';
import { createPopper } from '@popperjs/core';
import TrendChart from 'vue-trend-chart';

const moment = require('moment');

Vue.use(TrendChart);

export default {
    name: 'LineChart',
    props: ['xLabels', 'data', 'tooltipUnit'],
    data: () => ({
        popper: null,
        tooltipData: null
    }),
    mounted() {
        if (this.data.length < 2) return;

        const chart = this.$el.querySelector('.trend-chart');
        const ref = chart.querySelector(".active-line");
        const tooltip = this.$refs.tooltip;
        this.popper = createPopper(ref, tooltip, {
            placement: 'right',
            modifiers: [
                {
                    name: 'offset',
                    options: { offset: [0, 8] }
                },
                {
                    name: 'flip',
                    options: {
                        fallbackPlacements: ['left'],
                        boundary: chart
                    }
                }
            ]
        });
    },
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
            if (this.data && this.tooltipData && this.tooltipData.index)
                return parseInt(this.data[this.tooltipData.index]) != 1 ? `${this.tooltipUnit}s` : this.tooltipUnit;
            else
                return this.tooltipUnit;
        }
    }
}
</script>
<style lang="scss">
.gradient {
    stop-color: var(--v-primary-base);
}
.chart {
    .active-line {
        stroke: var(--v-primary-base);
    }
    .grid, .labels {
        line {
            stroke: var(--v-primary-base);
            stroke-width: 0.5;
        }
    }
    .y-labels, .x-labels {
        .label {
            color: var(--v-primary-base);
            font-size: 0.7em;
        }
    }
    .curve {
        .stroke {
            stroke: var(--v-primary-base);
            stroke-width: 1;
        }
        .fill {
          fill: var(--v-primary-base);
          opacity: 0.2;
        }
    }
}
.disabled-chart-container {
    position: relative
}
.disabled-chart-container {
    .disabled-chart {
        .grid, .labels {
            line {
                stroke: var(--v-primary-base);
                stroke-width: 0.5;
                opacity: 0.2;
            }
        }
        .y-labels, .x-labels {
            .label {
                color: var(--v-primary-base);
                font-size: 0.7em;
                opacity: 0.1;
            }
        }
        .curve {
            .stroke {
                stroke: var(--v-primary-base);
                stroke-width: 1;
                opacity: 0.1;
            }
            .fill {
              fill: var(--v-primary-base);
              opacity: 0.05;
            }
        }
    }
    .disabled-chart-title {
        margin: 0;
        position: absolute;
        top: 40%;
        left: 50%;
        margin-right: -50%;
        transform: translate(-50%, -50%)
    }

}
#tooltip {
    background: var(--v-primary-base);
    color: white;
    font-weight: bold;
    padding: 4px 8px;
    font-size: 13px;
    border-radius: 4px;
    display: none;
}
#tooltip[data-show] {
    display: block;
}
#arrow,
#arrow::before {
    position: absolute;
    width: 8px;
    height: 8px;
    background: inherit;
}

#arrow {
    visibility: hidden;
}

#arrow::before {
    visibility: visible;
    content: '';
    transform: rotate(45deg);
}
#tooltip[data-popper-placement^='top'] > #arrow {
  bottom: -4px;
}

#tooltip[data-popper-placement^='bottom'] > #arrow {
  top: -4px;
}

#tooltip[data-popper-placement^='left'] > #arrow {
  right: -4px;
}

#tooltip[data-popper-placement^='right'] > #arrow {
  left: -4px;
}
</style>
