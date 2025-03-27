<template>
    <div class="my-3 text-medium-emphasis">
        <!-- Raw Mode Display -->
        <div v-if="rawMode">
            <TransactionEventRawInfo
                :address="props.log.address"
                :contract="contract"
                :topics="[]"
                :data="JSON.stringify(props.log.raw)"
                :showEmitter="!props.self"
                :isTooltip="false"
            />
        </div>

        <!-- Short Mode Display -->
        <v-tooltip 
            v-else-if="props.label" 
            location="top" 
            :open-delay="150" 
            color="grey-darken-1" 
            content-class="tooltip"
        >
            <template v-slot:activator="{ props: tooltipProps }">
                <v-chip 
                    class="bg-primary-lighten-1" 
                    v-bind="tooltipProps" 
                    label 
                    size="small"
                >
                    <span class="color--text event-name">{{ eventLabel }}</span>
                </v-chip>
            </template>
            <LogDetails 
                :parsedLog="parsedLog"
                :log="props.log"
                :contract="contract"
                :self="props.self"
                :isTooltip="true"
                :unlink="true"
                :short="props.short"
            />
        </v-tooltip>

        <!-- Full Mode Display -->
        <LogDetails 
            v-else
            :parsedLog="parsedLog"
            :log="props.log"
            :contract="contract"
            :self="props.self"
            :isTooltip="false"
            :short="props.short"
        />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, defineAsyncComponent } from 'vue';
import { findAbiForEvent, decodeLog } from '@/lib/abi';

// Lazy load components
const LogDetails = defineAsyncComponent(() => import('./TransactionEventLogDetails.vue'));
const TransactionEventRawInfo = defineAsyncComponent(() => import('./TransactionEventRawInfo.vue'));

// Props definition
const props = defineProps({
    log: {
        type: Object,
        required: true
    },
    short: {
        type: Boolean,
        default: false
    },
    self: {
        type: Boolean,
        default: false
    },
    label: {
        type: Boolean,
        default: false
    }
});

// Inject server from app context
const $server = inject('$server');

// Reactive state
const parsedLog = ref(null);
const contract = ref(null);
const rawMode = ref(false);

// Computed property
const eventLabel = computed(() => {
    return parsedLog.value?.name || props.log.topics?.[0];
});

// Server interaction and log parsing
onMounted(async () => {
    if (!props.log.topics) {
        rawMode.value = true;
        return;
    }

    if (props.log.contract?.abi) {
        parsedLog.value = decodeLog(props.log, props.log.contract.abi);
    }
    else if (props.log.topics) {
        const abi = findAbiForEvent(props.log.topics[0]);
        if (abi) {
            parsedLog.value = decodeLog(props.log, abi);
        }
    }

    try {
        const { data } = await $server.getContract(props.log.address);
        if (data) {
            contract.value = data.proxyContract || data;
            if (contract.value?.abi) {
                parsedLog.value = decodeLog(props.log, contract.value.abi);
            }
        }
    } catch (error) {
        console.error('Failed to fetch contract:', error);
    }
});
</script>

<style scoped>
.event-name {
    display: block;
    max-width: 11ch;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.tooltip {
    opacity: 1!important;
}
</style>
