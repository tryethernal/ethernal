<template>
    <v-dialog v-model="dialog" max-width="600">
        <v-card>
            <v-card-title class="d-flex justify-space-between align-center">
                <h4>Add Domain Alias</h4>
                <v-btn color="grey" variant="text" icon="mdi-close" @click="close()"></v-btn>
            </v-card-title>
            <v-card-text>
                <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
                <v-form @submit.prevent="save()" v-model="valid">
                    Enter your domain alias without the "http(s)" protocol.
                    <v-text-field
                        class="mt-2"
                        :rules="[v => !!domainOrigin || 'Invalid format']"
                        density="compact"
                        variant="outlined"
                        v-model="domain"
                        persistent-hint
                        label="Domain Alias"></v-text-field>
                    <template v-if="domainOrigin">
                        <div class="mb-1">Log in to the account you have with your DNS provider, and add the following record:</div>
                        <div style="border-radius: 5px;" class="mb-1 pa-2 bg-black text-white font-weight-medium">{{ domainOrigin }}
                            A <template v-if="envStore.isSelfHosted">&lt;ethernal-server-ip&gt;</template><template v-else>37.16.1.34</template>
                        </div>
                    </template>
                    <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn @click="save()" :loading="loading" :disabled="!valid" color="primary" tyoe="submit">Save</v-btn>
                    </v-card-actions>
                </v-form>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
<script setup>
import { ref, computed, inject } from 'vue';
import { useEnvStore } from '@/stores/env';

const valid = ref(false);
const loading = ref(false);
const dialog = ref(false);
const errorMessage = ref(null);
const explorer = ref(null);
const domain = ref(null);
let resolve = null;
let reject = null;

const $server = inject('$server');
const envStore = useEnvStore();

const domainOrigin = computed(() => {
    try {
        if (!domain.value) return null;
        if (domain.value.startsWith('http://') || domain.value.startsWith('https://'))
            return null;
        const url = new URL(`https://${domain.value}`);
        return url.host;
    } catch (error) {
        return null;
    }
});

function save() {
    loading.value = true;
    errorMessage.value = null;

    $server.addExplorerDomain(explorer.value.id, domainOrigin.value)
        .then(() => close(true))
        .catch(error => {
            loading.value = false;
            errorMessage.value = error.response && error.response.data || 'Error while adding domain. Please retry.';
        });
}

function open(options) {
    dialog.value = true;
    valid.value = false;
    errorMessage.value = null;
    loading.value = false;
    domain.value = null;
    explorer.value = options.explorer;
    return new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
}

function close(refresh) {
    if (resolve) resolve(refresh);
    reset();
}

function reset() {
    resolve = null;
    reject = null;
    dialog.value = false;
}

defineExpose({ open, close });
</script>
