<template>
    <v-chip variant="outlined" label color="success">
        <template #prepend>
            <v-icon class="mr-1" color="success">mdi-check</v-icon>
        </template>
        Processed on rollup
    </v-chip>

    <v-icon class="mx-2" color="success">mdi-arrow-right-thick</v-icon>

    <v-chip variant="outlined" label :color="sentToParentChainData.color">
        <template #prepend v-if="sentToParentChainData.icon">
            <v-icon class="mr-1" :color="sentToParentChainData.color">{{ sentToParentChainData.icon }}</v-icon>
        </template>
        Sent to parent chain
    </v-chip>

    <v-icon class="mx-2" :color="sentToParentChainData.color">mdi-arrow-right-thick</v-icon>

    <v-chip variant="outlined" label :color="sentToParentChainData.color">
        <template #prepend v-if="confirmedOnParentChainData.icon">
            <v-icon class="mr-1" :color="confirmedOnParentChainData.color">{{ confirmedOnParentChainData.icon }}</v-icon>
        </template>
        Confirmed on parent chain
    </v-chip>
</template>
<script setup>
import { defineProps, computed } from 'vue';

const props = defineProps({
    status: {
        type: String,
        required: true
    }
});

const STATE_ORDER = ['processed_on_rollup', 'pending_on_parent', 'confirmed_on_parent_chain', 'finalized_on_parent'];

const sentToParentChainData = computed(() => {
    let color = 'grey';
    let icon;
    if (STATE_ORDER.indexOf(props.status) == 1) {
        color = 'warning';
        icon = 'mdi-clock-outline';
    } else if (STATE_ORDER.indexOf(props.status) > 1) {
        color = 'success';
        icon = 'mdi-check';
    }

    return {
        color,
        icon
    }
});

const confirmedOnParentChainData = computed(() => {
    let color = 'grey';
    let icon;
    if (STATE_ORDER.indexOf(props.status) == 2) {
        color = 'warning';
        icon = 'mdi-clock-outline';
    } else if (STATE_ORDER.indexOf(props.status) > 2) {
        color = 'success';
        icon = 'mdi-check';
    }

    return {
        color,
        icon
    }
});


</script>
