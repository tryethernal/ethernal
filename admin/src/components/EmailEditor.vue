<template>
    <div>
        <v-text-field
            v-model="subject"
            label="Subject"
            density="compact"
            class="mb-2"
        />
        <v-textarea
            v-model="body"
            label="Email Body"
            rows="8"
            density="compact"
        />
        <v-btn
            color="primary"
            size="small"
            :loading="saving"
            :disabled="!hasChanges"
            @click="save"
        >
            Save Draft
        </v-btn>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
    modelSubject: String,
    modelBody: String,
    onSave: Function
});

const subject = ref(props.modelSubject || '');
const body = ref(props.modelBody || '');
const saving = ref(false);

watch(() => props.modelSubject, v => { subject.value = v || ''; });
watch(() => props.modelBody, v => { body.value = v || ''; });

const hasChanges = computed(() =>
    subject.value !== props.modelSubject || body.value !== props.modelBody
);

async function save() {
    if (!props.onSave) return;
    saving.value = true;
    try {
        await props.onSave({ emailSubject: subject.value, emailBody: body.value });
    } finally {
        saving.value = false;
    }
}
</script>
