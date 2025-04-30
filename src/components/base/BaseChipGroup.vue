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
import { useTheme } from 'vuetify';

const theme = useTheme();

const props = defineProps({ 
    backgroundColor: {
        type: String,
        default: null
    }
});

const { contrastingColor } = useContrastingColor(props.backgroundColor || theme.current.value.colors['surface-variant']);
</script>
