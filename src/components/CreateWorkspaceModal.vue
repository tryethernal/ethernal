<template>
<v-dialog v-model="dialog" max-width="700">
    <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
            <h4>Create Workspace</h4>
            <v-btn color="grey" variant="text" icon="mdi-close" @click="close(false)"></v-btn>
        </v-card-title>
        <CreateWorkspace @workspaceCreated="onWorkspaceCreated" @goToBilling="goToBilling" />
    </v-card>
</v-dialog>
</template>
<script setup>
import { ref, inject } from 'vue';
import { useRouter } from 'vue-router';
import CreateWorkspace from './CreateWorkspace.vue';

const dialog = ref(false);
const resolveRef = ref(null);
const rejectRef = ref(null);
const router = useRouter();
const $server = inject('$server');

function open() {
    dialog.value = true;
    return new Promise((resolve, reject) => {
        resolveRef.value = resolve;
        rejectRef.value = reject;
    });
}

function close(workspaceCreated = false) {
    const resolve = resolveRef.value;
    reset();
    if (resolve) resolve(workspaceCreated);
}

function onWorkspaceCreated(workspaceData) {
    $server.setCurrentWorkspace(workspaceData.name)
        .then(() => document.location = '/overview');
}

function goToBilling() {
    close(false);
    router.push({ path: '/settings', query: { tab: 'billing' }});
}

function reset() {
    dialog.value = false;
    resolveRef.value = null;
    rejectRef.value = null;
}

defineExpose({ open, close });
</script>
