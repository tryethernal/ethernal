<template>
    <v-layout fill-height class="background">
        <v-row class="fill-height my-0">
            <v-col cols="7" class="fill-height">
                <v-row class="fill-height" align="center">
                    <v-col class="text-center">
                        <h1 class="logo">Ethernal</h1>
                        <p>
                            Ethernal is an open source block explorer for private EVM-based chains.
                        </p>
                        <p>
                            If you are new to Ethernal, you should keep the <a href="https://doc.tryethernal.com" target="_blank">doc</a> in a tab nearby!
                        </p>
                    </v-col>
                </v-row>
            </v-col>
            <v-col cols="5" class="primary fill-height">
                <v-row class="fill-height" align-self="center" align="center">
                    <v-col cols="2"></v-col>
                    <v-col cols="8">
                        <v-card v-if="signInMode" outlined>
                            <v-alert class="mb-0" dense text type="error" v-show="error">{{ error }}</v-alert>
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
                                        <v-btn id="signIn" :disabled="!valid" :loading="loading" color="primary" type="submit">Sign In</v-btn>
                                    </v-card-actions>
                                </v-form>
                            </v-card-text>
                        </v-card>
                        <v-card v-else-if="signUpMode" outlined>
                            <v-alert class="mb-0" dense text type="error" v-show="error">{{ error }}</v-alert>
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
                        <v-card v-else-if="forgottenPwdMode" outlined>
                            <v-alert class="mb-0" dense text type="error" v-show="error">{{ error }}</v-alert>
                            <v-alert class="mb-0" dense text type="success" v-show="success">{{ success }}</v-alert>
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
                        <v-card v-else-if="resetPwdMode" outlined>
                            <v-alert class="mb-0" dense text type="error" v-show="error">{{ error }}</v-alert>
                            <v-alert class="mb-0" dense text type="success" v-show="success">{{ success }}</v-alert>
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
                    <v-col cols="2"></v-col>
                </v-row>
            </v-col>
        </v-row>
    </v-layout>
</template>

<script>
export default {
    name: 'Auth',
    data: () => ({
        success: null,
        valid: false,
        error: null,
        loading: false,
        mode: 'signin',
        email: null,
        password: null
    }),
    mounted() {
        if (this.$route.query.token)
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
            this.server.signIn(this.email, this.password)
                .then(({ data: { user }}) => {
                    this.$store.dispatch('updateUser', user).then(() => document.location.href = '/transactions');
                })
                .catch(error => {
                    this.error = error.response.data;
                    this.loading = false
                });
        },
        signUp() {
            this.loading = true;
            this.error = null;
            this.server.signUp(this.email, this.password)
                .then(({ data: { user }}) => {
                    this.$store.dispatch('updateUser', user).then(() => document.location.href = '/transactions');
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
            this.server.sendResetPasswordEmail(this.email)
                .then(() => this.success = 'An email has been sent with a link to reset your password.')
                .catch(error => this.error = error.response.data)
                .finally(() => this.loading = false);
        },
        resetPassword() {
            this.loading = true;
            this.error = null;
            this.success = null;
            this.server.resetPassword(this.$route.query.token, this.password)
                .then(() => this.success = 'Your password has been reset successfully, you can now login.')
                .catch(error => this.error = error.response.data)
                .finally(() => this.loading = false);
        }
    },
    computed: {
        signInMode() { return this.mode == 'signin' },
        signUpMode() { return this.mode == 'signup' },
        forgottenPwdMode() { return this.mode == 'forgottenPwd' },
        resetPwdMode() { return this.mode == 'resetPwd' }
    }
}
</script>
<style scoped>
a:hover {
    text-decoration: underline;
}
</style>
