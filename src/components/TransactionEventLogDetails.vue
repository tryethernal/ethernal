<template>
    <span :class="{ 'pre-wrap': isTooltip }">
        <template v-if="parsedLog">
            <span v-if="parsedLog.args.length > 0">
                <template v-if="!self">
                    <Hash-Link 
                        type="address"
                        :unlink="unlink"
                        :notCopiable="true"
                        :withTokenName="true"
                        :withName="true"
                        :hash="log.address"
                        :contract="contract"
                    />.</template>{{ `${parsedLog.name}(\n` }}
            </span>
            <span v-else>
                <template v-if="!self">{{ `${contract?.name}.` }}</template>{{ parsedLog.name }}()
            </span>

            <!-- Show first item always -->
            <div 
                v-if="parsedLog.eventFragment.inputs.length > 0"
                class="ml-4"
                style="word-break: break-all;"
            >
                <div
                    v-for="(input, index) in parsedLog.eventFragment.inputs.slice(0, maxShortLines)"
                    :key="index"
                >
                    <Formatted-Sol-Var 
                        :input="input"
                        :value="parsedLog.args[index]"
                    />
                </div>
            </div>

            <!-- Show remaining items if not short or if expanded -->
            <template v-if="(!short || isExpanded) && parsedLog.eventFragment.inputs.length > maxShortLines">
                <div 
                    v-for="(input, index) in parsedLog.eventFragment.inputs.slice(maxShortLines)" 
                    :key="index"
                    class="ml-4 pt-0"
                >
                    <Formatted-Sol-Var 
                        :input="input"
                        :value="parsedLog.args[index + maxShortLines]"
                    />
                </div>
            </template>

            <!-- Show expand/collapse button if in short mode and there are more items -->
            <div 
                v-if="short && parsedLog.eventFragment.inputs.length > maxShortLines"
                class="ml-4 mt-n2"
            >
                <v-btn
                    variant="text"
                    density="compact"
                    size="x-small"
                    color="grey-darken-1"
                    class="ml-4 px-0 text-caption"
                    @click="isExpanded = !isExpanded"
                >
                    {{ isExpanded ? '▼ less' : `▶ ${parsedLog.eventFragment.inputs.length - maxShortLines} more` }}
                </v-btn>
            </div>

            <span v-if="parsedLog.args.length > 0">{{ ')' }}</span>
        </template>
        <template v-else>
            <TransactionEventRawInfo
                :address="log.address"
                :contract="contract"
                :topics="log.topics"
                :data="log.data"
                :showEmitter="!self"
                :isTooltip="isTooltip"
            />
        </template>
    </span>
</template>

<script setup>
import { defineAsyncComponent, ref } from 'vue';
import HashLink from './HashLink.vue';
import FormattedSolVar from './FormattedSolVar.vue';

// Lazy load components
const TransactionEventRawInfo = defineAsyncComponent(() => import('./TransactionEventRawInfo.vue'));

// State
const isExpanded = ref(false);

defineProps({
    parsedLog: {
        type: Object,
        default: null
    },
    log: {
        type: Object,
        required: true
    },
    contract: {
        type: Object,
        default: null
    },
    self: {
        type: Boolean,
        default: false
    },
    isTooltip: {
        type: Boolean,
        default: false
    },
    unlink: {
        type: Boolean,
        default: false
    },
    short: {
        type: Boolean,
        default: false
    },
    maxShortLines: {
        type: Number,
        default: 3
    }
});
</script>

<style scoped>
.pre-wrap {
    white-space: pre;
}
</style>
