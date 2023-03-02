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
                            <v-card-title>Sign In</v-card-title>
                            <v-card-text>
                                <v-form>
                                    <v-text-field v-model="email" name="email" label="Email" type="text"></v-text-field>
                                    <v-text-field v-model="password" name="password" label="Password" type="password"></v-text-field>
                                </v-form>
                                <v-card-actions class="px-0">
                                    <div style="float: left;">
                                        <small><a @click="switchMode()">Sign Up</a></small><br>
                                        <small><a>Forgot My Password</a></small>
                                    </div>
                                    <v-spacer></v-spacer>
                                    <v-btn :loading="loading" color="primary" @click="signIn()">Sign In</v-btn>
                                </v-card-actions>
                            </v-card-text>
                        </v-card>
                        <v-card v-else outlined>
                            <v-card-title>Sign Up</v-card-title>
                            <v-card-text>
                                <v-form>
                                    <v-text-field v-model="email" name="email" label="Email" type="text"></v-text-field>
                                    <v-text-field v-model="password" name="password" label="Password" type="password"></v-text-field>
                                </v-form>
                                <v-card-actions class="px-0">
                                    <div style="float: left;">
                                        <small><a @click="switchMode()">Sign In</a></small><br>
                                        <small><a>Forgot My Password</a></small>
                                    </div>
                                    <v-spacer></v-spacer>
                                    <v-btn :loading="loading" color="primary" @click="signUp()">Sign Up</v-btn>
                                </v-card-actions>
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
        loading: false,
        signInMode: true,
        email: null,
        password: null
    }),
    methods: {
        switchMode() {
            this.email = null;
            this.password = null;
            this.signInMode = !this.signInMode;
        },
        signIn() {
            this.server.signIn(this.email, this.password)
                .then()
        }
    }
}
</script>
<style scoped>
a:hover {
    text-decoration: underline;
}
</style>
