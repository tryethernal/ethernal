<template>
    <v-container>
        <v-row>
            <v-col>
                <v-card outlined>
                    <v-card-title class="justify-center">Upgrade Explorer</v-card-title>
                </v-card>
            </v-col>
        </v-row>

        <v-row>
            <v-col>
                <v-card outlined>
                    <v-alert class="mb-0" dense text type="error" v-show="errorMessage">{{ errorMessage }}</v-alert>
                        <v-card-title>Sign Up</v-card-title>
                        <v-card-text>
                            <v-form @submit.prevent="signUp" v-model="valid">
                                <v-text-field
                                    :rules="[
                                        v => !!v || 'Email is required',
                                        v => /.+@.+\..+/.test(v) || 'Email must be valid',
                                    ]"
                                    outlined required v-model="email" name="email" label="Email" type="text"></v-text-field>
                                <v-text-field
                                    :rules="[
                                        v => !!v || 'Password is required',
                                    ]"
                                    outlined  required v-model="password" name="password" label="Password" type="password"></v-text-field>

                                <v-btn :disabled="!valid" :loading="loading" color="primary" type="submit">Sign Up</v-btn>
                            </v-form>
                        </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>

export default {
    name: 'DemoExplorerUpgrade',
    components: {
    },
    data: () => ({
        valid: false,
        errorMessage: null,
        email: null,
        password: null
    }),
    mounted() {
    },
    methods: {
        submit() {
        }
    },
    computed: {}
};
</script>
<style scoped lang="scss">
.v-application {
    background: #f7f7f7
}
</style>
