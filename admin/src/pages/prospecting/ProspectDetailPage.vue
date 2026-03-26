<template>
    <v-container v-if="prospect">
        <v-btn variant="text" to="/prospecting" class="mb-2">Back to Queue</v-btn>
        <h1 class="text-h5 mb-4">{{ prospect.companyName || prospect.domain || 'Unknown Prospect' }}</h1>

        <v-row>
            <v-col cols="12" md="8">
                <v-card class="mb-4">
                    <v-card-title>Company Info</v-card-title>
                    <v-card-text>
                        <v-row dense>
                            <v-col cols="6"><strong>Domain:</strong> {{ prospect.domain || 'N/A' }}</v-col>
                            <v-col cols="6"><strong>Chain:</strong> {{ prospect.chainName }} ({{ prospect.chainType }})</v-col>
                            <v-col cols="6"><strong>Launch Status:</strong> {{ prospect.launchStatus }}</v-col>
                            <v-col cols="6"><strong>Signal Source:</strong> {{ prospect.signalSource }}</v-col>
                            <v-col cols="6"><strong>Lead Type:</strong> {{ prospect.leadType }}</v-col>
                            <v-col cols="6"><strong>Score:</strong> {{ prospect.confidenceScore }}</v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <v-card class="mb-4" v-if="prospect.research">
                    <v-card-title>Research</v-card-title>
                    <v-card-text>
                        <pre style="white-space: pre-wrap;">{{ prospect.research }}</pre>
                    </v-card-text>
                </v-card>

                <v-card class="mb-4">
                    <v-card-title>Contact</v-card-title>
                    <v-card-text>
                        <v-text-field v-model="contact.name" label="Name" density="compact" />
                        <v-text-field v-model="contact.email" label="Email" density="compact" />
                        <v-text-field v-model="contact.linkedin" label="LinkedIn" density="compact" />
                        <v-btn size="small" color="primary" @click="saveContact">Save Contact</v-btn>
                    </v-card-text>
                </v-card>

                <v-card class="mb-4">
                    <v-card-title>Email Draft</v-card-title>
                    <v-card-text>
                        <EmailEditor
                            :model-subject="prospect.emailSubject"
                            :model-body="prospect.emailBody"
                            :on-save="saveDraft"
                        />
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" md="4">
                <v-card class="mb-4">
                    <v-card-title>Actions</v-card-title>
                    <v-card-text>
                        <v-chip :color="statusColor" class="mb-3">{{ prospect.status }}</v-chip>
                        <div class="d-flex flex-column ga-2">
                            <v-btn
                                color="success"
                                :disabled="prospect.status !== 'draft_ready' || !prospect.contactEmail"
                                @click="handleSend"
                            >
                                Approve & Send
                            </v-btn>
                            <v-btn color="warning" @click="handleSnooze">Snooze</v-btn>
                            <v-btn color="error" @click="handleReject">Reject</v-btn>
                        </div>
                    </v-card-text>
                </v-card>

                <v-card>
                    <v-card-title>Timeline</v-card-title>
                    <v-card-text>
                        <ProspectTimeline :events="prospect.events || []" />
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
    <v-container v-else>
        <v-progress-circular indeterminate color="primary" />
    </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/lib/api';
import EmailEditor from '@/components/EmailEditor.vue';
import ProspectTimeline from '@/components/ProspectTimeline.vue';

const route = useRoute();
const prospect = ref(null);

const contact = reactive({ name: '', email: '', linkedin: '' });

const statusColor = computed(() => {
    const colors = {
        detected: 'grey', draft_ready: 'blue', approved: 'green', sent: 'teal',
        replied: 'success', no_reply: 'grey', rejected: 'error', snoozed: 'orange'
    };
    return colors[prospect.value?.status] || 'grey';
});

onMounted(async () => {
    const { data } = await api.get(`/prospects/${route.params.id}`);
    prospect.value = data;
    contact.name = data.contactName || '';
    contact.email = data.contactEmail || '';
    contact.linkedin = data.contactLinkedin || '';
});

async function saveContact() {
    const { data } = await api.put(`/prospects/${prospect.value.id}`, {
        contactName: contact.name,
        contactEmail: contact.email,
        contactLinkedin: contact.linkedin
    });
    prospect.value = data;
}

async function saveDraft({ emailSubject, emailBody }) {
    const { data } = await api.put(`/prospects/${prospect.value.id}`, { emailSubject, emailBody });
    prospect.value = data;
}

async function handleSend() {
    if (confirm(`Send email to ${prospect.value.contactEmail}?`)) {
        await api.post(`/prospects/${prospect.value.id}/send`);
        const { data } = await api.get(`/prospects/${prospect.value.id}`);
        prospect.value = data;
    }
}

async function handleSnooze() {
    const { data } = await api.put(`/prospects/${prospect.value.id}`, { status: 'snoozed' });
    prospect.value = data;
}

async function handleReject() {
    const { data } = await api.put(`/prospects/${prospect.value.id}`, { status: 'rejected' });
    prospect.value = data;
}
</script>
