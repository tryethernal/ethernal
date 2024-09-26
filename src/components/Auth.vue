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
                <v-card v-if="signInMode" border>
                    <v-alert class="mb-0" density="compact" text type="info" v-show="explorerToken">Sign up or sign in in order to finish setting up your explorer</v-alert>
                    <v-alert class="mb-0" density="compact" text type="error" v-show="error">{{ error }}</v-alert>
                    <v-card-title>Sign In</v-card-title>
                    <v-card-text>
                        <v-form @submit.prevent="signIn" v-model="valid">
                            <v-text-field
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
                                    <small><a @click="switchMode('signup')">Sign Up</a></small><br>
                                    <small><a @click="switchMode('forgottenPwd')">Forgot My Password</a></small>
                                </div>
                                <v-spacer></v-spacer>
                                <v-btn :disabled="!valid" :loading="loading" color="primary" type="submit">Sign In</v-btn>
                            </v-card-actions>
                        </v-form>
                    </v-card-text>
                </v-card>
                <v-card v-else-if="signUpMode" border>
                    <v-alert class="mb-0" density="compact" text type="info" v-show="explorerToken">Sign up or sign in in order to finish setting up your explorer</v-alert>
                    <v-alert class="mb-0" density="compact" text type="error" v-show="error">{{ error }}</v-alert>
                    <v-card-title>Sign Up</v-card-title>
                    <v-card-text>
                        <v-form @submit.prevent="signUp" v-model="valid">
                            <v-text-field
                                :rules="[
                                    v => !!v || 'Email is required',
                                    v => /.+@.+\..+/.test(v) || 'Email must be valid',
                                ]"
                                required v-model="email" name="email" label="Email" type="text"></v-text-field>
                            <v-text-field
                                :rules="[
                                    v => !!v || 'Password is required',
                                ]"
                                required v-model="password" name="password" label="Password" type="password"></v-text-field>

                            <v-card-actions class="px-0">
                                <div style="float: left;">
                                    <small><a @click="switchMode('signin')">Sign In</a></small><br>
                                    <small><a @click="switchMode('forgottenPwd')">Forgot My Password</a></small>
                                </div>
                                <v-spacer></v-spacer>
                                <v-btn :disabled="!valid" :loading="loading" color="primary" type="submit">Sign Up</v-btn>
                            </v-card-actions>
                        </v-form>
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
                                required v-model="email" name="email" label="Email" type="text"></v-text-field>

                            <v-card-actions class="px-0">
                                <div style="float: left;">
                                    <small><a @click="switchMode('signin')">Sign In</a></small><br>
                                    <small><a @click="switchMode('signup')">Sign Up</a></small>
                                </div>
                                <v-spacer></v-spacer>
                                <v-btn :disabled="!valid" :loading="loading" color="primary" type="submit">Submit</v-btn>
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
                                <v-btn :disabled="!valid" :loading="loading" color="primary" type="submit">Submit</v-btn>
                            </v-card-actions>
                        </v-form>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-layout>
</template>

<script>
import { mapStores } from 'pinia';
import { useUserStore } from '../stores/user';

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
    }),
    mounted() {
        if (this.explorerToken)
            this.mode = 'signup';
        else if (this.$route.query.token)
            this.mode = 'resetPwd';
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
                    document.location.href = `/transactions${this.explorerToken ? '?explorerToken=' + this.explorerToken : ''}`;
                })
                .catch(error => {
                    console.log(error);
                    this.error = error.response && error.response.data ? error.response.data : 'Error while signing in. Please retry.';
                    this.loading = false
                });
        },
        signUp() {
            this.loading = true;
            this.error = null;
            this.$server.signUp(this.email, this.password, this.explorerToken)
                .then(({ data: { user }}) => {
                    this.userStore.updateUser(user)
                    document.location.href = `/transactions${this.explorerToken ? '?explorerToken=' + this.explorerToken : ''}`;
                })
                .catch(error => {
                    this.error = error.response.data;
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
            this.$server.resetPassword(this.$route.query.token, this.password)
                .then(() => this.success = 'Your password has been reset successfully, you can now login.')
                .catch(error => this.error = error.response.data)
                .finally(() => this.loading = false);
        }
    },
    computed: {
        ...mapStores(useUserStore),
        signInMode() { return this.mode == 'signin' },
        signUpMode() { return this.mode == 'signup' },
        forgottenPwdMode() { return this.mode == 'forgottenPwd' },
        resetPwdMode() { return this.mode == 'resetPwd' },
        explorerToken() { return this.$route.query.explorerToken }
    }
}
</script>
<style scoped>
a:hover {
    text-decoration: underline;
}
</style>
