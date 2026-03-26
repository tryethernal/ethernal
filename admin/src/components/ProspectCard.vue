<template>
    <v-card class="mb-3" variant="outlined">
        <v-card-title class="d-flex align-center">
            <span>{{ prospect.companyName || prospect.domain || 'Unknown' }}</span>
            <v-spacer />
            <v-chip size="small" :color="leadTypeColor" class="mr-2">{{ prospect.leadType }}</v-chip>
            <v-chip size="small" color="info">Score: {{ prospect.confidenceScore }}</v-chip>
        </v-card-title>
        <v-card-subtitle>
            {{ prospect.chainName }} ({{ prospect.chainType }}) - {{ prospect.launchStatus }}
            <span class="ml-2 text-medium-emphasis">via {{ prospect.signalSource }}</span>
            <v-chip v-if="!prospect.contactEmail" size="x-small" color="warning" class="ml-2">Missing Contact</v-chip>
        </v-card-subtitle>
        <v-card-text v-if="expanded">
            <v-divider class="mb-3" />
            <div v-if="prospect.research" class="mb-3">
                <div class="text-subtitle-2">Research</div>
                <div class="text-body-2">{{ prospect.research }}</div>
            </div>
            <div v-if="prospect.contactName" class="mb-2">
                <strong>Contact:</strong> {{ prospect.contactName }} ({{ prospect.contactEmail }})
            </div>
            <div v-if="prospect.emailSubject" class="mb-2">
                <div class="text-subtitle-2">Email Draft</div>
                <div class="text-body-2 font-weight-medium">{{ prospect.emailSubject }}</div>
                <pre class="text-body-2 mt-1" style="white-space: pre-wrap;">{{ prospect.emailBody }}</pre>
            </div>
        </v-card-text>
        <v-card-actions>
            <v-btn size="small" variant="text" @click="expanded = !expanded">
                {{ expanded ? 'Collapse' : 'Expand' }}
            </v-btn>
            <v-spacer />
            <slot name="actions" />
        </v-card-actions>
    </v-card>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({ prospect: Object });
const expanded = ref(false);

const leadTypeColor = computed(() =>
    props.prospect.leadType === 'warm_lead' ? 'orange' : 'grey'
);
</script>
