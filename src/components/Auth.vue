<template>
    <v-layout fill-height>
        <v-row class="fill-height">
            <v-col cols="7" class="fill-height">
                <v-row class="fill-height" align-self="center" align="center">
                    <v-col class="fill-height">
                        <iframe height="100%" id="ston-ezj3cSR8Nn" width="100%" frameBorder="0" name="StonlyExplanation" allowfullscreen src="https://stonly.com/borderlessembed/ezj3cSR8Nn/view/"> </iframe>
                    </v-col>
            </v-row>
            </v-col>
            <v-spacer></v-spacer>
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
