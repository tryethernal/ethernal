<template>
    <v-card outlined class="flex-grow-1">
        <v-card-text v-if="syncStatus">
            <v-alert v-if="errorMessage" dense text type="error">{{ errorMessage }}</v-alert>
            <div v-if="explorer.stripeSubscription">
                <b class="success--text" v-if="isSyncActive">Your explorer is synchronizing blocks.</b>
                <b class="error--text" v-else-if="isSyncStopped">
                    Your explorer is not synchronizing blocks.<span v-if="isRpcUnreachable"> RPC is unreachable</span>.
                </b>
                <b class="warning--text" v-else-if="isSyncStarting">Starting synchronization...</b>
                <b class="warning--text" v-else-if="isSyncStopping">Stopping synchronization...</b>
                <b class="error--text" v-else>Unknown synchronization status ({{ syncStatus }}).</b>
            </div>
            <div v-else>
                <b class="error--text">Synchronization will become available once a subscription has been started.</b>
            </div>
            <v-btn v-if="isSyncActive && explorer.stripeSubscription" :loading="loading" class="mt-2" color="primary" @click="stopSync()">Stop Sync</v-btn>
            <v-btn v-else :loading="loading" :disabled="!explorer.stripeSubscription" class="mt-2" color="primary" @click="startSync()">Start Sync</v-btn>
        </v-card-text>
        <v-card-text v-else>
            <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
        </v-card-text>
    </v-card>
</template>

<script>
import { mapGetters } from 'vuex';
const moment = require('moment');

export default {
    name: 'ExplorerSync',
    props: ['explorer'],
    data: () => ({
        loading: false,
        syncStatus: null,
        errorMessage: null,
        timeout: null
    }),
    mounted() {
        this.getSyncStatus();
        this.$root.$on('waitForOnlineSync', () => {
            this.loading = true;
            this.waitForStatus('online');
        });
    },
    destroyed() {
        if (this.timeout)
            clearTimeout(this.timeout);
    },
    methods: {
        moment,
        getSyncStatus() {
            this.loading = true;
            this.server.getExplorerSyncStatus(this.explorer.id)
                .then(({ data: { status }}) => this.syncStatus = status)
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        stopSync() {
            this.loading = true;
            this.errorMessage = null;
            this.server.stopExplorerSync(this.explorer.id)
                .then(() => this.waitForStatus('stopped'))
                .catch(error => {
                    console.log(error);
                    this.loading = false;
                });
        },
        startSync() {
            this.loading = true;
            this.errorMessage = null;
            this.server.startExplorerSync(this.explorer.id)
                .then(() => this.waitForStatus('online'))
                .catch(error => {
                    this.errorMessage = error.response && error.response.data || 'Error while starting sync. Please retry.';
                    this.loading = false;
                });
        },
        waitForStatus(newStatus) {
            // Starting/Stoppping sync will enqueue a process. So we need to fetch the status until we get what we expect
            this.server.getExplorerSyncStatus(this.explorer.id)
                .then(({ data: { status }}) => {
                    this.syncStatus = status;
                    if (status != newStatus && newStatus == 'online') {
                        if (this.isRpcUnreachable) this.loading = false;
                        else this.timeout = setTimeout(() => this.waitForStatus(newStatus), 1000);
                    }
                    else if (status != newStatus)
                        setTimeout(() => this.waitForStatus(newStatus), 1000);
                    else
                        this.loading = false;
                })
                .catch(error => {
                    console.log(error);
                    this.loading = false;
                });
        }
    },
    computed: {
        ...mapGetters([
            'mainDomain'
        ]),
        isSyncActive() { return this.syncStatus == 'online' },
        isSyncStarting() { return this.syncStatus == 'launching' },
        isSyncStopping() { return this.syncStatus == 'stopping' },
        isSyncStopped() { return this.syncStatus == 'stopped' || this.syncStatus == 'unreachable' },
        isRpcUnreachable() { return this.syncStatus == 'unreachable' }
    }
}
</script>
