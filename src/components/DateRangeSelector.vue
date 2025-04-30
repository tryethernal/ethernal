<template>
    <div>
        <v-chip-group mandatory class="pt-0 mb-1" v-model="selectedRange" :selected-class="`text-${contrastingColor}`">
            <v-chip class="pa-2" size="small" value="7">7 Day</v-chip>
            <v-chip class="pa-2" size="small" value="30">30 Days</v-chip>
            <v-chip class="pa-2" size="small" value="alltime">All Time</v-chip>
            <v-chip class="pa-2 pl-3" size="small" prepend-icon="mdi-calendar" value="custom" @click="showCustomPicker = true">
                <span v-if="selectedRange != 'custom'">Custom Range</span>
                <span v-else-if="from && to">{{ from.toLocaleDateString() }} to {{ to.toLocaleDateString() }}</span>
                <span v-else>Custom Range</span>
            </v-chip>
        </v-chip-group>
        <v-dialog v-model="showCustomPicker" width="auto" persistent>
            <v-card class="ma-0">
                <v-date-picker :max="new Date()" multiple="range" show-adjacent-months color="primary" v-model="pickerRange" @update:modelValue="validateDate">
                    <template v-slot:header></template>
                    <template v-slot:title>
                        <span v-if="!pickerRange.length" class="text-subtitle-2">Select Start Day</span>
                        <span v-else-if="pickerRange.length == 1" class="text-subtitle-2">Select End Day</span>
                        <span v-else class="text-subtitle-2">{{ pickerRange[0].toLocaleDateString() }} to {{ pickerRange[pickerRange.length - 1].toLocaleDateString() }}</span>
                        <v-btn size="small" style="position: absolute; right: 0; top: 0;" color="white" icon="mdi-close" variant="text" @click="closeCustomPicker"></v-btn>
                    </template>
                </v-date-picker>
                <v-card-actions>
                    <v-btn variant="text" @click="closeCustomPicker">Close</v-btn>
                    <v-btn variant="text" :disabled="pickerRange.length < 2" @click="applyRange">Apply</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup>
import { DateTime } from 'luxon';
import { ref, watch, onMounted, computed } from 'vue';
import { useTheme } from 'vuetify';
import { getBestContrastingColor } from '@/lib/utils';

const previousSelectedRange = ref(null);
const showCustomPicker = ref(false);
const selectedRange = ref(null);
const pickerRange = ref([]);
const from = ref(null);
const to = ref(null);

const emit = defineEmits(['rangeUpdated']);
const props = defineProps({
    initialRange: {
        type: String,
        default: "7"
    }
});

const theme = useTheme();

const validateDate = (dates) => {
    // If we have exactly 2 dates, sort them to ensure correct order
    if (dates.length === 2) {
        const sortedDates = [...dates].sort((a, b) => a - b);
        pickerRange.value = sortedDates;
    }
};

const contrastingColor = computed(() => {
    return getBestContrastingColor(theme.current.value.colors['surface-variant'], theme.current.value.colors);
});

const applyRange = () => {
    if (pickerRange.value.length >= 2){
        from.value = new Date(pickerRange.value[0]);
        to.value = new Date(pickerRange.value[pickerRange.value.length - 1]);
        emitRange();
    }

    showCustomPicker.value = false;
}

const closeCustomPicker = () => {
    showCustomPicker.value = false;
    if (pickerRange.value.length < 2) {
        pickerRange.value = [];
        selectedRange.value = previousSelectedRange.value;
    }
}

const emitRange = () => {
    emit('rangeUpdated', {
        from: DateTime.fromJSDate(from.value).toFormat('yyyy-MM-dd'),
        to: DateTime.fromJSDate(to.value).toFormat('yyyy-MM-dd')
    });
}

watch(selectedRange, (newVal, oldVal) => {
    if (oldVal == 'custom' && newVal != 'custom' && newVal == previousSelectedRange.value && pickerRange.value.length == 0)
        return;
    else if (newVal == 'custom') {
        from.value = null;
        to.value = null;
        return previousSelectedRange.value = oldVal;
    }

    if (oldVal)
        previousSelectedRange.value = oldVal;

    pickerRange.value = [];

    from.value = newVal == 'alltime' ? new Date(0) : new Date(new Date() - (parseInt(newVal) - 1) * 24 * 3600 * 1000);
    to.value = new Date();

    emitRange();
});

onMounted(() => {
    selectedRange.value = props.initialRange;
});
</script>
