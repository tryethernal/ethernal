<template>
    <v-timeline density="compact" side="end">
        <v-timeline-item
            v-for="event in events"
            :key="event.id"
            :dot-color="eventColor(event.event)"
            size="small"
        >
            <div class="d-flex justify-space-between">
                <strong>{{ formatEvent(event.event) }}</strong>
                <span class="text-caption text-medium-emphasis">{{ formatDate(event.createdAt) }}</span>
            </div>
            <div v-if="event.metadata" class="text-caption text-medium-emphasis">
                {{ JSON.stringify(event.metadata) }}
            </div>
        </v-timeline-item>
    </v-timeline>
</template>

<script setup>
defineProps({ events: { type: Array, default: () => [] } });

function eventColor(event) {
    const colors = {
        detected: 'grey',
        email_drafted: 'blue',
        approved: 'green',
        sent: 'green',
        opened: 'teal',
        clicked: 'cyan',
        replied: 'success',
        bounced: 'error',
        unsubscribed: 'warning',
        follow_up_drafted: 'blue',
        follow_up_sent: 'green',
        rejected: 'error',
        snoozed: 'orange',
        no_reply: 'grey'
    };
    return colors[event] || 'grey';
}

function formatEvent(event) {
    return event.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(date) {
    return new Date(date).toLocaleString();
}
</script>
