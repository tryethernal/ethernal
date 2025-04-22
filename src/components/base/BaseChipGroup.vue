<template>
    <v-chip-group
        :selected-class="`text-${contrastingColor}`"
        v-bind="$attrs"
    >
        <slot></slot>
    </v-chip-group>
</template>

<script setup>
import { useContrastingColor } from '@/composables/useContrastingColor';

const props = defineProps({ 
    backgroundColor: {
        type: String,
        default: '#4242421f'
    }
});

const { contrastingColor } = useContrastingColor(props.backgroundColor);
</script>
