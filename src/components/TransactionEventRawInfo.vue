<template>
    <div>
        <template v-if="showEmitter">
            <b>Emitter:</b>&nbsp;
            <Hash-Link 
                type="address" 
                :hash="address" 
                :contract="contract"
            />
            <br>
        </template>
        <b>Topics:</b>
        <ul>
            <li 
                class="ml-6" 
                v-for="(topic, idx) in topics" 
                :key="idx"
            >
                {{ topic }}
            </li>
        </ul>
        <div :class="{ 'raw-input': isTooltip, 'log-data': !isTooltip }">
            <b>Data:</b> {{ data }}
        </div>
    </div>
</template>

<script setup>
import HashLink from './HashLink.vue';

defineProps({
    address: {
        type: String,
        required: true
    },
    contract: {
        type: Object,
        default: null
    },
    topics: {
        type: Array,
        required: true
    },
    data: {
        type: String,
        required: true
    },
    showEmitter: {
        type: Boolean,
        default: true
    },
    isTooltip: {
        type: Boolean,
        default: false
    }
});
</script>
