<template>
    <v-layout fill-height class="background">
        <v-row class="fill-height my-0">
            <v-col cols="7" class="fill-height">
                <v-row class="fill-height" align="center">
                    <v-col class="text-center">
                        <h1 class="logo">Ethernal</h1>
                        <p>
                            Ethernal is a block explorer for private Ethereum blockchains, currently in open Beta.
                        </p>
                        <p>
                            If you are new to Ethernal, you should keep the <a href="https://doc.tryethernal.com" target="_blank">doc</a> in a tab nearby!
                        </p>
                    </v-col>
                </v-row>
            </v-col>
            <v-col cols="5" class="primary fill-height">
                <v-row class="fill-height" align-self="center" align="center">
                    <v-col>
                        <div id="firebaseui-auth-container"></div>
                    </v-col>
                </v-row>
            </v-col>
        </v-row>
    </v-layout>
</template>

<script>
import 'firebaseui/dist/firebaseui.css'
const firebaseui = require('firebaseui');

import { auth } from '../plugins/firebase.js';

export default {
    name: 'Auth',
    data: () => ({
        carousel: 0,
        slides: [
            'Real time transactions',
            'Contract interactions'
        ]
    }),
    mounted: function() {
        var ui = new firebaseui.auth.AuthUI(auth());
        ui.start('#firebaseui-auth-container', {
            signInSuccessUrl: '/transactions',
            signInOptions: [
                {
                    provider: auth.EmailAuthProvider.PROVIDER_ID,
                    requireDisplayName: false
                }
            ]
        });
    }
}
</script>
