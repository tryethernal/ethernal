<template>
    <v-container fluid>
        <h4 class="text-center mt-6 mb-10">{{ explorerStore.name }} Gas Tracker <v-icon color="primary">mdi-gas-station</v-icon></h4>
        <div class="mb-2">Next update in 2s</div>
        <v-row>
            <v-col cols="3">
                <v-card rounded="lg" class="fill-height text-center">
                    <v-card-title>Low</v-card-title>
                    <v-card-text>
                        <div>1.336 gwei</div>
                        <div>
                            <small>Base: 1.11 | Priority: 0.005</small>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="3">
                <v-card rounded="lg" class="fill-height text-center">
                    <v-card-title>Average</v-card-title>
                    <v-card-text>
                        <div>1.336 gwei</div>
                        <div>
                            <small>Base: 1.11 | Priority: 0.005</small>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="3">
                <v-card rounded="lg" class="fill-height text-center">
                    <v-card-title>High</v-card-title>
                    <v-card-text>
                        <div>1.336 gwei</div>
                        <div>
                            <small>Base: 1.11 | Priority: 0.005</small>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
        <v-row>
            <v-col cols="6">
                <v-card>
                    <v-card-title>Additional Info</v-card-title>
                    <v-card-text>
                        <v-row>
                            <v-col cols="3">
                                <v-card class="ma-0 pa-0" variant="tonal">
                                    <template #title>
                                        <div class="d-flex flex-column">
                                    <span class="text-caption">LAST BLOCK</span>
                                    <small>1234567890</small>
                                </div>
                                    </template>
                                </v-card>
                            </v-col>
                            <v-col cols="3">
                                <v-card class="ma-0 pa-0" variant="tonal">
                                    <template #title>
                                        <div class="d-flex flex-column">
                                    <span class="text-caption">PENDING QUEUE</span>
                                    <small>1234</small>
                                </div>
                                    </template>
                                </v-card>
                            </v-col>
                            <v-col cols="3">
                                <v-card class="ma-0 pa-0" variant="tonal">
                                    <template #title>
                                        <div class="d-flex flex-column">
                                    <span class="text-caption">AVG BLOCK SIZE</span>
                                    <small>100</small>
                                </div>
                                    </template>
                                </v-card>
                            </v-col>
                            <v-col cols="3">
                                <v-card class="ma-0 pa-0" variant="tonal">
                                    <template #title>
                                        <div class="d-flex flex-column">
                                    <span class="text-caption">AVG. UTILIZATION</span>
                                    <small>52.76%</small>
                                </div>
                                    </template>
                                </v-card>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="6">
                <v-card>
                    <v-card-title>Additional Info</v-card-title>
                    <v-card-text>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import { useExplorerStore } from '../stores/explorer';

const explorerStore = useExplorerStore();

</script>
