<template>
    <v-card border="none">
        <v-card-text class="pb-0" v-if="step === 2">
            <template v-if="success">
                <div class="text-success">
                    <v-icon class="mr-2">mdi-check-circle</v-icon>
                    Your demo explorer is ready! A link has been sent to your email.
                </div>
            </template>
        </v-card-text>
        <v-card-text>
            <v-slide-x-transition mode="out-in">
                <div :key="step">
                    <template v-if="step === 1">
                        <v-form @submit.prevent="onRpcSubmit" v-model="valid">
                            <v-text-field
                                :rules="[
                                    v => isUrlValid(v) || 'RPC needs to be a valid URL',
                                    v => !!v || 'RPC server is required'
                                ]"
                                variant="outlined" v-model="rpcServer" label="RPC URL" placeholder="https://my.rpc.com:8545" required :disabled="loading">
                                <template v-slot:append>
                                    <v-btn style="height: 56px;" :loading="loading" color="primary" :disabled="!valid || loading" type="submit">Get Started</v-btn>
                                </template>
                            </v-text-field>
                        </v-form>
                    </template>
                    <template v-else>
                        <v-form @submit.prevent="submit" ref="emailForm" v-model="emailValid" v-if="!success">
                            <v-text-field
                                v-model="email"
                                label="Email"
                                autocomplete="email"
                                hint="We'll send you the link to the explorer"
                                persistent-hint
                                :rules="emailRules"
                                required
                            >
                                <template v-slot:append>
                                    <v-btn style="height: 56px;" variant="flat" color="primary" :loading="loading" :disabled="!emailValid || loading" type="submit">Create Explorer</v-btn>
                                    <v-btn style="height: 56px;" variant="text" color="primary" @click="reset">Back</v-btn>
                                </template>
                            </v-text-field>
                        </v-form>
                        <div v-else-if="success" class="text-success">
                            <v-icon class="mr-2">mdi-check-circle</v-icon>
                            Your demo explorer is ready! A link has been sent to your email.
                        </div>
                    </template>
                </div>
            </v-slide-x-transition>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import { useUserStore } from '../stores/user';

const valid = ref(false);
const rpcServer = ref(null);
const loading = ref(false);
const nativeToken = ref('ether');
const success = ref(false);
const email = ref('');
const emailValid = ref(false);
const emailForm = ref(null);
const emailRules = [
    v => !!v || 'Email is required',
    v => /.+@.+\..+/.test(v) || 'E-mail must be valid'
];

const userStore = useUserStore();
const $server = inject('$server');
const $posthog = inject('$posthog');

const step = ref(1); // 1: RPC, 2: Email

onMounted(() => {
    $server.getCurrentUser()
        .then(({ data }) => userStore.updateUser(data))
        .catch(() => userStore.updateUser(null));
});

function onRpcSubmit() {
    if (!valid.value) return;
    step.value = 2;
    email.value = '';
    emailValid.value = false;
    success.value = false;
}
function reset() {
    step.value = 1;
    email.value = '';
    emailValid.value = false;
    success.value = false;
}
function submit() {
    if (!emailForm.value.validate()) return;
    loading.value = true;
    success.value = false;
    $server.createDemoExplorer(
        null,
        rpcServer.value,
        null,
        email.value
    )
        .then(() => {
            success.value = true;
            $posthog?.capture('explorer:explorer_create', {
                source: 'landing',
                is_demo: true
            });
        })
        .catch(error => {
            // eslint-disable-next-line no-console
            console.log(error);
            alert(error.response && error.response.data || 'Error while creating explorer. Please retry.');
        })
        .finally(() => loading.value = false);
}
function isUrlValid(url) {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}
</script>
<style scoped>
/deep/ .v-input__append-outer {
    margin-top: 0;
}
/deep/ .v-card {
    background: #f7f7f7 !important;
}
</style>
