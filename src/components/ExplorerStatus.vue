<template>
    <v-container fluid>
        <v-card class="pa-4">
            <template v-if="isExplorerSectionAvailable">
                <h2>Explorer Status</h2>
                <v-row class="mt-2">
                    <v-col cols="2" v-if="syncStatus || loading">
                        <v-alert :class="`${explorerClass}--text`" :type="explorerClass" border="start" border-color>
                            <small style="position: absolute;">Sync Status</small>
                            <div class="text-right">
                                <v-tooltip location="left">
                                    <template v-slot:activator="{ props }">
                                        <v-icon v-bind="props" size="small">mdi-information</v-icon>
                                    </template>
                                    <template v-if="syncStatus == 'healthy'">Sync is working properly. Blocks & transactions should appear in near real-time in the explorer.</template>
                                    <template v-if="syncStatus == 'recovering'">Sync is not working properly. We are working on getting things back up. In the meantime, blocks won't be synced in real-time but batched every 5 minutes.</template>
                                </v-tooltip>
                            </div>
                            <div v-if="syncStatus" class="mt-4 text-h4">{{ syncStatus.toUpperCase() }}</div>
                            <v-skeleton-loader v-else type="list-item"></v-skeleton-loader>
                        </v-alert>
                    </v-col>
                    <v-col cols="4" v-if="isLatestCheckedBlockAvailable && isStartingBlockAvailable || loading">
                        <v-alert type="info" variant="tonal" border="start" border-color>
                            <small style="position: absolute;">Block Integrity</small>
                            <div class="text-right">
                                <v-tooltip location="left">
                                    <template v-slot:activator="{ props }">
                                        <v-icon v-bind="props" size="small">mdi-information</v-icon>
                                    </template>
                                    The explorer is regularly checking that all blocks are accounted for, and that none are missing.<br>
                                    This means that we can guarantee that all blocks between #{{ startingBlock }} and #{{ latestCheckedBlock }}
                                    have been indexed successfully as well as their transactions.
                                </v-tooltip>
                            </div>
                            <div v-if="startingBlock !== null && latestCheckedBlock" class="mt-4 text-h4 text-center">{{ startingBlock }} -> {{ latestCheckedBlock }}</div>
                            <v-skeleton-loader v-else type="list-item"></v-skeleton-loader>
                        </v-alert>
                    </v-col>
                    <v-col cols="2" v-if="latestCheckedAt || loading">
                        <v-alert type="info" variant="tonal" border="start" border-color>
                            <small>Latest Check</small>
                            <div v-if="latestCheckedAt" class="mt-4 text-h4 text-center">
                                {{ $dt.format(latestCheckedAt, 'h:mma') }}<br>
                            </div>
                            <v-skeleton-loader v-else type="list-item"></v-skeleton-loader>
                        </v-alert>
                    </v-col>
                </v-row>
            </template>

            <div v-if="isRpcSectionAvailable" class="mt-4">
                <h2>RPC Status</h2>
                <v-row class="mt-2">
                    <v-col cols="3" v-if="isRpcReachable !== null && isRpcReachable !== undefined || loading">
                        <v-alert :class="`${rpcClass}--text`" :type="rpcClass" border="start" border-color>
                            <small style="position: absolute;">Status</small>
                            <div class="text-right">
                                <v-tooltip location="left">
                                    <template v-slot:activator="{ props }">
                                        <v-icon v-bind="props" size="small">mdi-information</v-icon>
                                    </template>
                                    <template v-if="isRpcReachable">We are able to query the RPC endpoint for new blocks.</template>
                                    <template v-else>
                                        We are not able to query the RPC endpoint, new blocks won't be indexed.
                                    </template>
                                </v-tooltip>
                            </div>
                            <div v-if="rpcStatus" class="mt-4 text-h4" style="text-transform: uppercase;">{{ rpcStatus.toUpperCase() }}</div>
                            <v-skeleton-loader v-else type="list-item"></v-skeleton-loader>
                        </v-alert>
                    </v-col>
                    <v-col cols="3" v-if="rpcHealthCheckedAt || loading">
                        <v-alert variant="tonal" class="text-primary" border="start" border-color>
                            <small>Latest Check</small>
                            <div v-if="rpcHealthCheckedAt" class="mt-4 text-h4 text-center">
                                {{ $dt.format(rpcHealthCheckedAt, 'h:mm:ssa') }}<br>
                            </div>
                            <v-skeleton-loader v-else type="list-item"></v-skeleton-loader>
                        </v-alert>
                    </v-col>
                </v-row>
            </div>
        </v-card>
    </v-container>
</template>
<script>

export default {
    name: 'ExplorerStatus',
    data: () => ({
        syncStatus: null,
        latestCheckedBlock: null,
        latestCheckedAt: null,
        startingBlock: null,
        isRpcReachable: null,
        rpcHealthCheckedAt: null,
        loading: true
    }),
    mounted() {
        this.fetchStatus();
        setInterval(() => this.fetchStatus(), 5000);
    },
    methods: {
        fetchStatus() {
            this.$server.getExplorerStatus()
                .then(({ data }) => {
                    this.syncStatus = data.syncStatus;
                    this.latestCheckedBlock = data.latestCheckedBlock;
                    this.latestCheckedAt = data.latestCheckedAt;
                    this.startingBlock = data.startingBlock;
                    this.isRpcReachable = data.isRpcReachable;
                    this.rpcHealthCheckedAt = data.rpcHealthCheckedAt;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        }
    },
    computed: {
        isExplorerSectionAvailable() {
            return this.syncStatus
                || this.isLatestCheckedBlockAvailable && this.isStartingBlockAvailable
                || this.latestCheckedAt;
        },
        isRpcSectionAvailable() {
            return this.isRpcReachable !== null && this.isRpcReachable !== undefined
                || this.rpcHealthCheckedAt;
        },
        isLatestCheckedBlockAvailable() {
            return this.latestCheckedBlock !== null && this.latestCheckedBlock !== undefined;
        },
        isStartingBlockAvailable() {
            return this.startingBlock !== null && this.startingBlock !== undefined;
        },
        explorerClass() {
            if (!this.syncStatus) return null;
            return this.syncStatus == 'healthy' ? 'success' : 'warning';
        },
        rpcClass() {
            if (this.isRpcReachable === null || this.isRpcReachable === undefined) return null;
            return this.isRpcReachable ? 'success' : 'error'
        },
        rpcStatus() {
            if (this.isRpcReachable === null || this.isRpcReachable === undefined) return null;
            return this.isRpcReachable ? 'Reachable' : 'Unreachable';
        }
    }
}
</script>
