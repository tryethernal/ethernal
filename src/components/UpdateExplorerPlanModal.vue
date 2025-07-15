<template>
    <v-dialog v-model="dialog" max-width="1800" :persistent="true">
        <v-card>
            <v-card-title class="d-flex justify-space-between align-center">
                <h4>Select A Plan</h4>
                <v-btn color="grey" variant="text" icon="mdi-close" @click="close"></v-btn>
            </v-card-title>
            <v-card-text>
                <v-alert class="mb-4" variant="tonal" type="info">High volume networks may qualify for a free ad-supported plan with all features included. Contact us at contact@tryethernal.com to learn more.</v-alert>
                <Explorer-Plan-Selector
                    :pendingCancelation="options.pendingCancelation"
                    :currentPlanSlug="options.currentPlanSlug"
                    :isTrialing="options.isTrialing"
                    :explorerId="options.explorerId"
                    :stripeSuccessUrl="`http://app.${envStore.mainDomain}/explorers/${options.explorerId}?justCreated=true`"
                    :stripeCancelUrl="`http://app.${envStore.mainDomain}/explorers/${options.explorerId}`"
                    @planUpdated="planUpdated"
                    @planCanceled="planCanceled"
                    @planCreated="planUpdated"
                />
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
<script setup>
import { ref } from 'vue';
import { useEnvStore } from '../stores/env';
import ExplorerPlanSelector from './ExplorerPlanSelector.vue';

const envStore = useEnvStore();

const dialog = ref(false);
const resolve = ref(null);
const reject = ref(null);
const options = ref({});
const refresh = ref(false);

function open(opts) {
    dialog.value = true;
    options.value = opts;
    return new Promise((res, rej) => {
        resolve.value = res;
        reject.value = rej;
    });
}

function planUpdated(slug) {
    options.value.currentPlanSlug = slug;
    options.value.pendingCancelation = false;
    refresh.value = true;
}
function close() {
    if (resolve.value) resolve.value(refresh.value);
    reset();
}

function planCanceled(shouldClose) {
    refresh.value = true;
    if (shouldClose)
        close();
    else
        options.value.pendingCancelation = true;
}

function reset() {
    dialog.value = false;
    resolve.value = null;
    reject.value = null;
    refresh.value = false;
}

defineExpose({ open });
</script>
