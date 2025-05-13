<!--
    This component is a modal that pops up when clicking on the link in the banner at
    the top of demo explorers.
    It explains the features of the explorer and let the user migrate this demo to
    a trial.
    It has 3 elements:
     - An intro with a listing of the main features
     - A form to sign-in / sign-up
     - A button to setup the trial
-->
<template>
    <v-dialog v-model="dialog" persistent width="auto" min-width="50%">
        <v-card>
            <v-card-title class="d-flex justify-space-between align-center">
                <h4>Activate Your Explorer</h4>
                <v-btn color="grey" size="small" variant="text" icon="mdi-close" @click="close" />
            </v-card-title>
            <v-card-text class="d-flex flex-column ga-4">
                <template class="d-flex flex-lg-row flex-column justify-space-between ga-4">
                    <v-card rounded="lg" border="primary md">
                        <v-card-text>
                            <span class="text-primary font-weight-bold">Complete your setup to unlock all Ethernal features:</span>
                            <v-list class="mt-2">
                                <v-list-item>
                                    <template #title>
                                        <span style="text-wrap: wrap;">Brand your explorer (logo, colors, fonts, links, ...)</span>
                                    </template>
                                    <template #prepend><v-icon color="primary">mdi-palette</v-icon></template>
                                </v-list-item>
                                <v-list-item>
                                    <template #title>
                                        <span style="text-wrap: wrap;">Set a custom gas token</span>
                                    </template>
                                    <template #prepend><v-icon color="primary">mdi-alpha-c-circle</v-icon></template>
                                </v-list-item>
                                <v-list-item>
                                    <template #title>
                                        <span style="text-wrap: wrap;">Use your own domain</span>
                                    </template>
                                    <template #prepend><v-icon color="primary">mdi-web</v-icon></template>
                                </v-list-item>
                                <v-list-item>
                                    <template #title>
                                        <span style="text-wrap: wrap;">Sync historical blocks</span>
                                    </template>
                                    <template #prepend><v-icon color="primary">mdi-history</v-icon></template>
                                </v-list-item>
                                <v-list-item>
                                    <template #title>
                                        <span style="text-wrap: wrap;">Integrate a dex and a faucet</span>
                                    </template>
                                    <template #prepend><v-icon color="primary">mdi-swap-horizontal</v-icon></template>
                                </v-list-item>
                                <v-list-item>
                                    <template #title>
                                        <span style="text-wrap: wrap;">Up to 5M monthly transactions included</span>
                                    </template>
                                    <template #prepend><v-icon color="primary">mdi-arrow-left-right</v-icon></template>
                                </v-list-item>
                            </v-list>
                        </v-card-text>
                    </v-card>
                    <v-card v-if="!explorerId" rounded="lg" border="primary md" min-width="50%">
                        <v-card-text v-if="!mode">
                            <span class="text-primary font-weight-bold">Enter an email to get started</span>
                            <v-form class="mt-4" @submit.prevent="checkEmail" v-model="valid">
                                <v-text-field
                                    :rules="[
                                        (value) => !!value || 'Email is required',
                                        (value) => /.+@.+\..+/.test(value) || 'Invalid email'
                                    ]"
                                    label="Email"
                                    v-model="email" />
                                <div align="center">
                                    <v-btn variant="flat" :disabled="!valid" :loading="loading" type="submit">Continue</v-btn>
                                </div>
                            </v-form>
                        </v-card-text>
                        <v-card-text v-else>
                            <span v-if="mode == 'signIn'" class="text-primary font-weight-bold">Looks like you already have an account!</span>
                            <span v-else class="text-primary font-weight-bold">Looks like you don't have an account yet!</span>
                            <p class="my-4">
                                <v-icon color="primary">mdi-email</v-icon> {{ email }} | <a href="#" @click.prevent="resetEmail()">Change</a>
                            </p>
                            <v-form v-if="mode == 'signIn'" @submit.prevent="signIn" v-model="valid">
                                <v-alert class="mb-4" density="compact" type="error" v-if="errorMessage" :text="errorMessage" />
                                <v-text-field
                                    :rules="[
                                        (value) => !!value || 'Password is required',
                                    ]"
                                    label="Enter your password to finish the setup"
                                    type="password"
                                    v-model="password" />
                                <div align="center">
                                    <v-btn variant="flat" :disabled="!valid" :loading="loading" type="submit">Sign In</v-btn>
                                </div>
                            </v-form>
                            <v-form v-else @submit.prevent="signUp" v-model="valid">
                                <v-alert class="mb-4" density="compact" type="error" v-if="errorMessage" :text="errorMessage" />
                                <v-text-field
                                    :rules="[
                                        (value) => !!value || 'Password is required',
                                    ]"
                                    label="Enter a password to sign up"
                                    type="password"
                                    v-model="password" />
                                <div align="center">
                                    <v-btn variant="flat" :disabled="!valid" :loading="loading" type="submit">Sign Up</v-btn>
                                </div>
                            </v-form>
                        </v-card-text>
                    </v-card>
                    <v-card v-else rounded="lg" border="primary md" min-width="50%">
                        <v-card-text class="d-flex flex-column ga-4">
                            <v-alert variant="tonal" text="Your explorer is now ready!" type="success" />
                            <v-btn color="primary" @click="goToExplorer()">Continue To Dashboard</v-btn>
                        </v-card-text>
                    </v-card>
                </template>
                <v-card rounded="lg" border="primary md">
                    <v-card-text>
                        <span class="text-primary font-weight-bold">Need more time?</span>
                        <p class="mt-2">
                            Get an extended trial by contacting us via <a href="mailto:contact@tryethernal.com">email</a>,
                            <a href="https://t.me/antoinedc" target="_blank">Telegram</a>,
                            <a href="https://discord.gg/jEAprf45jj" target="_blank">Discord</a>,
                            or <a href="https://x.com/tryethernal" target="_blank">X</a>.
                        </p>
                    </v-card-text>
                </v-card>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
<script setup>
import { ref, defineExpose, inject } from 'vue';
import { useUserStore } from '@/stores/user';
import { useEnvStore } from '@/stores/env';

const dialog = ref(false);
const valid = ref(false);
const loading = ref(false);
const email = ref();
const password = ref();
const mode = ref(null);
const jwtToken = ref(null);
const errorMessage = ref(null);
const explorerId = ref(null);
const apiToken = ref(null);

const server = inject('$server');
const envStore = useEnvStore();
const userStore = useUserStore();
const open = (_jwtToken) => {
    dialog.value = true;
    jwtToken.value = _jwtToken;
}

const close = () => {
    dialog.value = false;
}

const resetEmail = () => {
    email.value = null;
    password.value = null;
    mode.value = null;
    errorMessage.value = null;
}

const goToExplorer = () => {
    document.location.href = `//${envStore.mainDomain}/auth?apiToken=${userStore.apiToken}&path=/explorers/${explorerId.value}`;
}

const checkEmail = () => {
    loading.value = true;
    server.checkEmail(email.value)
        .then(() => mode.value = 'signIn')
        .catch(() => mode.value = 'signUp')
        .finally(() => loading.value = false);
};

const migrateExplorer = () => {
    server.migrateDemoExplorer(jwtToken.value)
        .then(({ data }) => {
            explorerId.value = data.explorerId;
        })
        .catch(error => {
            errorMessage.value = error.response && error.response.data ? error.response.data : 'Error while migrating explorer. Please retry.';
        })
        .finally(() => loading.value = false);
}

const signIn = () => {
    loading.value = true;
    server.signIn(email.value, password.value)
        .then(({ data: { user }}) => {
            if (!user.canTrial)
                return document.location.href = `//${envStore.mainDomain}/auth?explorerToken=${jwtToken.value}&path=/transactions&apiToken=${user.apiToken}`;

            userStore.updateUser(user);
            migrateExplorer(user.apiToken);
        })
        .catch(error  => {
            loading.value = false;
            errorMessage.value = error.response && error.response.data ? error.response.data : 'Error while signing in. Please retry.';
        });
};

const signUp = () => {
    loading.value = true;
    server.signUp(email.value, password.value)
        .then(({ data: { user }}) => {
            userStore.updateUser(user);
            migrateExplorer(user.apiToken);
        })
        .catch(error => {
            loading.value = false;
            errorMessage.value = error.response && error.response.data ? error.response.data : 'Error while signing up. Please retry.';
        });
};

defineExpose({
    open
});
</script>

