<template>
    <v-container fluid>
        <v-row>
            <v-col>
                <v-card>
                    <v-card-text>
                        <v-row>
                            <v-col align="center">
                                <v-icon style="opacity: 0.25;" size="200" color="primary-lighten-1">mdi-bridge</v-icon>
                            </v-col>
                        </v-row>
                        <v-row>
                            <v-spacer></v-spacer>
                            <v-col cols="6" class="text-body-1">
                                At no extra cost, we'll setup a bridge UI for your chain, directly integrated in your explorer,
                                with your own branding.
                                We can support a variety of protocols, including:
                                <ul class="ml-8 mb-4">
                                    <li>OP Rollups Native Bridge</li>
                                    <li>Orbit Native Bridge</li>
                                    <li>Hyperlane</li>
                                    <li>Across</li>
                                    <li>...</li>
                                </ul>
                                If you have a custom set of contracts, we can also integrate them.
                            </v-col>
                            <v-spacer></v-spacer>
                        </v-row>
                        <v-card-actions class="mb-4">
                            <v-spacer></v-spacer>
                            <v-dialog width="500">
                                <template #activator="{ props }">
                                    <v-btn variant="flat" color="primary" v-bind="props">Get In Touch</v-btn>
                                </template>
                                <template v-slot:default>
                                    <v-card title="Get In Touch">
                                        <v-form @submit.prevent="submit" v-model="valid">
                                            <v-card-text class="py-0">
                                                <v-alert class="mb-3" :text="successMessage" density="compact" v-if="successMessage" type="success" />
                                                <v-alert class="mb-3" :text="errorMessage" density="compact" v-if="errorMessage" type="error" />

                                                <p class="text-body-2 mb-4">If you are interested in setting up a bridge UI for your chain, let us know and we'll get back to you within 24 hours.</p>
                                                <v-text-field class="mt-1" :rules="[v => !!v || 'Required field']" required v-model="bridge" placeholder="Native rollup bridge, Hyperlane, Across, etc..." label="What bridge protocol are you using or planning to use?" />
                                                <v-text-field class="mt-1" :rules="[v => !!v || 'Required field']" required v-model="contact" placeholder="Email address, Telegram handle, Discord username, ..." label="Preferred contact method" />
                                            </v-card-text>
                                            <v-card-actions class="my-2">
                                                <v-spacer></v-spacer>
                                                <v-btn variant="flat" :disabled="!valid" :loading="loading" color="primary" type="submit">Submit</v-btn>
                                                <v-spacer></v-spacer>
                                            </v-card-actions>
                                        </v-form>
                                    </v-card>
                                </template>
                            </v-dialog>
                            <v-spacer></v-spacer>
                        </v-card-actions>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>
<script setup>
import { ref, inject } from 'vue';
const bridge = ref('');
const contact = ref('');
const loading = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const valid = ref(false);
const $server = inject('$server');

const submit = async () => {
    loading.value = true;
    successMessage.value = '';
    errorMessage.value = '';
    $server.submitFeedback('Bridge Request', contact.value, bridge.value)
        .then(() => successMessage.value = 'Your message has been sent. We will get back to you within 24 hours.')
        .catch(() => errorMessage.value = 'An error occurred while submitting your message. Please try again.')
        .finally(() => loading.value = false);
}
</script>
