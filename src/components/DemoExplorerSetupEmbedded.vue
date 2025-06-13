<template>
    <v-main>
        <v-container fluid>
            <v-form class="mt-4" @submit.prevent="openEmailModal" v-model="valid">
                <v-row>
                    <v-col>
                        <v-text-field
                            :rules="[
                                v => isUrlValid(v) || 'RPC needs to be a valid URL',
                                v => !!v || 'RPC server is required'
                            ]"
                            variant="outlined" v-model="rpcServer" label="RPC URL" placeholder="https://my.rpc.com:8545" required>
                            <template v-slot:append>
                                <v-btn style="height: 56px;" :loading="loading" color="primary" :disabled="!valid" type="submit">Get Started</v-btn>
                            </template>
                        </v-text-field>
                    </v-col>
                </v-row>
            </v-form>
            <v-dialog v-model="emailModal" max-width="400">
                <v-card>
                    <v-card-title>One last thing...</v-card-title>
                    <v-card-text class="pb-0">
                        <template v-if="!success">
                            Enter your email address and we'll send you the link to the explorer.
                        </template>
                        <template v-else>
                            <div class="text-success">
                                <v-icon class="mr-2">mdi-check-circle</v-icon>
                                Your demo explorer is ready! A link has been sent to your email.
                            </div>
                        </template>
                    </v-card-text>
                    <v-card-text>
                        <v-form @submit.prevent="submit" ref="emailForm" v-model="emailValid" v-if="!success">
                            <v-text-field
                                v-model="email"
                                label="Email"
                                autocomplete="email"
                                :rules="emailRules"
                                required
                            />
                            <v-card-actions>
                                <v-spacer></v-spacer>
                                <v-btn text @click="closeEmailModal">Close</v-btn>
                                <v-btn variant="flat" color="primary" :loading="loading" :disabled="!emailValid || success" type="submit">Create Explorer</v-btn>
                            </v-card-actions>
                        </v-form>
                    </v-card-text>
                </v-card>
            </v-dialog>
        </v-container>
    </v-main>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import { useUserStore } from '../stores/user';

const valid = ref(false);
const rpcServer = ref(null);
const loading = ref(false);
const nativeToken = ref('ether');
const success = ref(false);
const emailModal = ref(false);
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

onMounted(() => {
    $server.getCurrentUser()
        .then(({ data }) => userStore.updateUser(data))
        .catch(() => userStore.updateUser(null));
});

function openEmailModal() {
    emailModal.value = true;
    email.value = '';
    emailValid.value = false;
    success.value = false;
}
function closeEmailModal() {
    emailModal.value = false;
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
