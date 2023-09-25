<template>
    <v-card outlined class="flex-grow-1">
        <v-card-text>
            <div>
                <b class="success--text" v-if="isSyncActive">Your explorer is synchronizing blocks.</b>
                <b class="error--text" v-else-if="isSyncStopped">Your explorer is not synchronizing blocks.</b>
                <b class="warning--text" v-else-if="isSyncStarting">Starting synchronization...</b>
                <b class="warning--text" v-else-if="isSyncStopping">Stopping synchronization...</b>
                <b class="error--text" v-else>Unknown synchronization status ({{ syncStatus }}).</b>
            </div>
            <v-btn v-if="isSyncActive" :loading="loading" class="mt-2" color="primary" @click="stopSync()">Stop Sync</v-btn>
            <v-btn v-else :loading="loading" class="mt-2" color="primary" @click="startSync()">Start Sync</v-btn>
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
        syncStatus: null
    }),
    mounted() {
        this.getSyncStatus();
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
            this.server.stopExplorerSync(this.explorer.id)
                .then(() => this.waitForStatus('stopped'))
                .catch(error => {
                    console.log(error);
                    this.loading = false;
                });
        },
        startSync() {
            this.loading = true;
            this.server.startExplorerSync(this.explorer.id)
                .then(() => this.waitForStatus('online'))
                .catch(error => {
                    console.log(error);
                    this.loading = false;
                });
        },
        waitForStatus(newStatus) {
            // Starting/Stoppping sync will enqueue a process. So we need to fetch the status until we get what we expect
            this.server.getExplorerSyncStatus(this.explorer.id)
                .then(({ data: { status }}) => {
                    this.syncStatus = status;
                    if (status != newStatus)
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
        isSyncStopped() { return this.syncStatus == 'stopped' }
    }
}
</script>
