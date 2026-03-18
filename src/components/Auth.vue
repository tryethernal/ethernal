<template>
    <v-layout class="bg-primary fill-height">
        <v-row class="fill-height ma-0" justify="center" no-gutters>
            <v-col lg="4" align-self="center">
                <div class="text-center text-white font-weight-medium">
                    <h1 class="logo-white">Ethernal</h1>
                    <p>
                        Ethernal is an open source block explorer for EVM-based chains.
                    </p>
                </div>
                <template v-if="willRedirect">
                    <v-card>
                        <v-card-text class="d-flex justify-center align-center">
                            <v-progress-circular
                                indeterminate
                                size="20"
                                color="primary" class="mr-4"></v-progress-circular>
                                Redirecting...
                        </v-card-text>
                    </v-card>
                </template>
                <template v-else>
                    <v-card v-if="signInMode" border>
                        <v-alert class="mb-0" density="compact" text type="error" v-show="error">{{ error }}</v-alert>
                        <v-card-title>Sign In</v-card-title>
                        <v-card-text>
                            <v-form @submit.prevent="signIn" v-model="valid">
                                <v-text-field
                                    variant="outlined"
                                    color="primary"
                                    :rules="[
                                        v => !!v || 'Email is required',
                                        v => /.+@.+\..+/.test(v) || 'Email must be valid',
                                    ]"
                                    required
                                    v-model="email" name="email" label="Email" type="text"></v-text-field>
                                <v-text-field
                                    :rules="[
                                        v => !!v || 'Password is required',
                                    ]"
                                    required
                                    v-model="password" name="password" label="Password" type="password"></v-text-field>
                                <v-card-actions class="px-0">
                                    <div style="float: left;">
                                        <small><a href="#" @click.prevent="switchMode('forgottenPwd')">Forgot My Password</a></small>
                                    </div>
                                    <v-spacer></v-spacer>
                                    <v-btn variant="flat" :disabled="!valid" :loading="loading" color="primary" type="submit">Sign In</v-btn>
                                </v-card-actions>
                            </v-form>
                            <p class="text-body-2 text-medium-emphasis text-center mt-4">
                                Don't have an account?
                                <router-link to="/onboarding" class="text-primary">Create one</router-link>
                            </p>
                        </v-card-text>
                    </v-card>
                    <v-card v-else-if="forgottenPwdMode" border>
                        <v-alert class="mb-0" density="compact" text type="error" v-show="error">{{ error }}</v-alert>
                        <v-alert class="mb-0" density="compact" text type="success" v-show="success">{{ success }}</v-alert>
                        <v-card-title>Forgotten Password?</v-card-title>
                        <v-card-text>
                            Enter your email below and we'll send you a link to reset your password.
                            <v-form @submit.prevent="sendResetPasswordEmail" v-model="valid">
                                <v-text-field
                                    :rules="[
                                        v => !!v || 'Email is required',
                                        v => /.+@.+\..+/.test(v) || 'Email must be valid',
                                    ]"
                                    required class="mt-3" v-model="email" name="email" label="Email" type="text"></v-text-field>

                                <v-card-actions class="px-0">
                                    <div style="float: left;">
                                        <small><a href="#" @click.prevent="switchMode('signin')">Sign In</a></small><br>
                                        <small><router-link to="/onboarding">Sign Up</router-link></small>
                                    </div>
                                    <v-spacer></v-spacer>
                                    <v-btn variant="flat" :disabled="!valid" :loading="loading" color="primary" type="submit">Submit</v-btn>
                                </v-card-actions>
                            </v-form>
                        </v-card-text>
                    </v-card>
                    <v-card v-else-if="resetPwdMode" border>
                        <v-alert class="mb-0" density="compact" text type="error" v-show="error">{{ error }}</v-alert>
                        <v-alert class="mb-0" density="compact" text type="success" v-show="success">{{ success }}</v-alert>
                        <v-card-title>Reset Password</v-card-title>
                        <v-card-text>
                            <v-form @submit.prevent="resetPassword" v-model="valid">
                                <v-text-field
                                    :rules="[
                                        v => !!v || 'Password is required',
                                    ]"
                                    required v-model="password" name="password" label="New Password" type="password"></v-text-field>

                                <v-card-actions class="px-0">
                                    <div style="float: left;">
                                        <small><a @click="switchMode('signin')">Sign In</a></small><br>
                                    </div>
                                    <v-spacer></v-spacer>
                                    <v-btn variant="flat" :disabled="!valid" :loading="loading" color="primary" type="submit">Submit</v-btn>
                                </v-card-actions>
                            </v-form>
                        </v-card-text>
                    </v-card>
                </template>
            </v-col>
        </v-row>
    </v-layout>
</template>

/**
 * @fileoverview Authentication page component.
 * Handles user sign-in, password reset, and forgotten password flows.
 * Redirects to /onboarding for sign-up and explorer token-based flows.
 * @component Auth
 */
<script>
import { mapStores } from 'pinia';
import { useUserStore } from '../stores/user';
import { useEnvStore } from '../stores/env';
export default {
    name: 'Auth',
    data: () => ({
        success: null,
        valid: false,
        error: null,
        loading: false,
        mode: 'signin',
        email: null,
        password: null,
        resetPasswordToken: null,
    }),
    mounted() {
        if (this.$route.query.apiToken && this.$route.query.path) {
            this.userStore.updateUser({ apiToken: this.$route.query.apiToken });
            document.location.href = `//${this.envStore.mainDomain}${this.$route.query.path}${this.$route.query.explorerToken ? `?explorerToken=${this.$route.query.explorerToken}` : ''}`;
        }
        else if (this.$route.query.token) {
            this.mode = 'resetPwd';
            this.resetPasswordToken = this.$route.query.token;
        }
        else {
            // Store URL params in sessionStorage for onboarding context
            const params = new URLSearchParams(window.location.search);
            const context = {};
            ['flow', 'chain', 'plan', 'explorerToken', 'rpc'].forEach(key => {
                if (params.get(key)) context[key] = params.get(key);
            });
            if (context.explorerToken) {
                context.flow = context.flow || 'public';
            }
            if (Object.keys(context).length) {
                sessionStorage.setItem('onboardingContext', JSON.stringify(context));
            }

            // Auto-redirect to onboarding if user arrives with explorerToken or flow params
            if (context.explorerToken || context.flow) {
                this.$router.push('/onboarding');
                return;
            }
        }
    },
    methods: {
        switchMode(newMode) {
            this.error = null;
            this.email = null;
            this.password = null;
            this.success = null;
            this.mode = newMode;
        },
        signIn() {
            this.loading = true;
            this.error = null;
            this.$server.signIn(this.email, this.password)
                .then(({ data: { user }}) => {
                    this.userStore.updateUser(user);
                    document.location.href = `/overview${this.explorerToken ? '?explorerToken=' + this.explorerToken : ''}`;
                })
                .catch(error => {
                    console.log(error);
                    this.error = error.response && error.response.data ? error.response.data : 'Error while signing in. Please retry.';
                    this.loading = false
                });
        },
        sendResetPasswordEmail() {
            this.loading = true;
            this.error = null;
            this.success = null;
            this.$server.sendResetPasswordEmail(this.email)
                .then(() => this.success = 'An email has been sent with a link to reset your password.')
                .catch(error => this.error = error.response.data)
                .finally(() => this.loading = false);
        },
        resetPassword() {
            this.loading = true;
            this.error = null;
            this.success = null;
            this.$server.resetPassword(this.resetPasswordToken, this.password)
                .then(() => this.success = 'Your password has been reset successfully, you can now login.')
                .catch(error => this.error = error.response.data)
                .finally(() => this.loading = false);
        }
    },
    computed: {
        ...mapStores(useUserStore, useEnvStore),
        signInMode() { return this.mode == 'signin' },
        forgottenPwdMode() { return this.mode == 'forgottenPwd' },
        resetPwdMode() { return this.mode == 'resetPwd' },
        explorerToken() { return this.$route.query.explorerToken },
        willRedirect() { return this.$route.query.apiToken && this.$route.query.path }
    }
}
</script>
<style scoped>
a {
    text-decoration: none;
}
a:hover {
    text-decoration: underline;
}
</style>
