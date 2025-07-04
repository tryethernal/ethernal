<template>
    <v-dialog v-model="dialog" :max-width="stepperIndex * 900" :persistent="true">
        <v-card>
            <v-card-title class="d-flex justify-space-between align-center">
                <h4>Create Explorer</h4>
                <v-btn color="grey" variant="text" icon="mdi-close" @click="close(false)"></v-btn>
            </v-card-title>
            <v-stepper-vertical flat v-model="stepperIndex">
                <v-stepper-vertical-item value="1" :complete="stepperIndex > 1">
                    <template v-slot:title>
                        <h4>Enter Setup Info</h4>
                    </template>
                    <template v-slot:prev></template>
                    <template v-slot:next></template>
                    <v-alert class="mb-4" density="compact" text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
                    <v-row>
                        <v-col cols="12">
                            <v-form ref="formRef" @submit.prevent="createExplorer" v-model="valid">
                                <v-text-field
                                    :rules="[v => !!v || 'Name is required']"
                                    variant="outlined" v-model="name" id="workspaceName" label="Name*" placeholder="My Ethereum Project" hide-details="auto" class="mb-3" required @input="validateForm"></v-text-field>
                                <v-text-field
                                    :rules="[
                                        v => isUrlValid(v) || 'RPC needs to be a valid URL',
                                        v => !!v || 'RPC server is required'
                                    ]"
                                    variant="outlined" v-model="rpcServer" id="workspaceServer" label="RPC Server*" placeholder="ws://localhost:8545" hide-details="auto" class="mb-2" required @input="validateForm"></v-text-field>
                                <v-card-actions>
                                    <v-spacer></v-spacer>
                                    <v-btn variant="flat" id="createExplorer" :loading="loading" color="primary" :disabled="!valid" type="submit">Create</v-btn>
                                </v-card-actions>
                            </v-form>
                        </v-col>
                    </v-row>
                </v-stepper-vertical-item>

                <v-stepper-vertical-item v-if="!envStore.isSelfHosted" value="2" :complete="stepperIndex > 2">
                    <template v-slot:title>
                        <h4>Choose A Plan</h4>
                    </template>
                    <template v-slot:prev></template>
                    <template v-slot:next></template>
                    <v-card>
                        <v-card-text>
                            <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
                            <ul style="list-style: none;" v-if="!userStore.cryptoPaymentEnabled || userStore.canTrial" class="mb-4 pl-0">
                                <li v-if="!userStore.cryptoPaymentEnabled">To setup crypto payment (Explorer 150 or above), reach out to contact@tryethernal.com.</li>
                                <li v-if="userStore.canTrial">Each plan includes a 7 day free trial - No credit card needed.</li>
                            </ul>
                            <ExplorerPlanSelector v-if="explorer"
                                :explorerId="explorer.id"
                                :stripeSuccessUrl="`http://${envStore.mainDomain}/explorers/${explorer.id}?justCreated=true`"
                                :stripeCancelUrl="`http://${envStore.mainDomain}/explorers/${explorer.id}`"
                                @planCreated="planCreated"></ExplorerPlanSelector>
                        </v-card-text>
                    </v-card>
                </v-stepper-vertical-item>
            </v-stepper-vertical>
        </v-card>
    </v-dialog>
</template>
<script setup>
import { ref, inject } from 'vue';
import { useUserStore } from '../stores/user';
import { useEnvStore } from '../stores/env';
import { isUrlValid } from '../lib/utils';
import ExplorerPlanSelector from './ExplorerPlanSelector.vue';

const emit = defineEmits(['explorerCreated']);

const stepperIndex = ref(1);
const loading = ref(false);
const dialog = ref(false);
const errorMessage = ref(null);
const name = ref(null);
const rpcServer = ref(null);
const valid = ref(false);
const explorer = ref(null);
const formRef = ref(null);
let resolve = null;
let reject = null;

const userStore = useUserStore();
const envStore = useEnvStore();

const $server = inject('$server');
const $router = inject('$router');

function open() {
    dialog.value = true;
    return new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
}

function validateForm() {
    if (formRef.value) {
        formRef.value.validate();
    }
}

function createExplorer() {
    loading.value = true;
    errorMessage.value = null;
    $server.createExplorerFromOptions(name.value, rpcServer.value)
        .then(({ data }) => {
            explorer.value = data;
            emit('explorerCreated');

            if (!envStore.isSelfHosted && !userStore.canUseDemoPlan)
                stepperIndex.value = 2;
            else
                $router.push({ path: `/explorers/${explorer.value.id}?status=success`});
        })
        .catch(error => {
            console.log(error);
            errorMessage.value = error.response && error.response.data || 'Error while creating explorer. Please retry.';
        })
        .finally(() => loading.value = false);
}

function planCreated() {
    $router.push({ path: `/explorers/${explorer.value.id}?status=success` });
}

function close() {
    if (resolve) resolve();
    reset();
}

function reset() {
    dialog.value = false;
    stepperIndex.value = 1;
    name.value = null;
    rpcServer.value = null;
    valid.value = false;
    explorer.value = null;
    resolve = null;
    reject = null;
}

defineExpose({ open, close });
</script>
