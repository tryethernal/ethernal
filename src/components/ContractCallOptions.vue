<template>
    <div>
        <v-card class="mb-4" :loading="loading">
            <v-card-text>
                <v-alert density="compact" type="info" text class="mb-3" v-if="!accounts.length && userStore.isAdmin">
                    To call contracts with loaded accounts, go to the "Accounts" tab and sync them from your chain, or add them using a private key or the impersonification feature.
                </v-alert>
                <div class="mb-5" v-if="accounts.length">
                    Call Contract With: <a :class="{ underlined: mode != 'accounts' }" @click="mode = 'accounts'">Loaded Accounts</a> | <a :class="{ underlined: mode != 'metamask' }" @click="mode = 'metamask'">Metamask</a>
                </div>
                <Metamask v-if="displayMetamask" @rpcConnectionStatusChanged="onRpcConnectionStatusChanged"></Metamask>
                <v-row v-else>
                    <v-col cols="5">
                        <v-select
                            variant="outlined"
                            density="compact"
                            label="Select from address"
                            v-model="from"
                            item-title="address"
                            :items="accounts"
                            return-object>
                            <template v-slot:item="{ item }">
                                <v-icon size="small" class="mr-1" v-if="item.privateKey">mdi-lock-open-outline</v-icon>
                                {{ item.address }}
                            </template>
                            <template v-slot:selection="{ item }">
                                <v-icon size="small" class="mr-1" v-if="item.privateKey">mdi-lock-open-outline</v-icon>
                                {{ item.address }}
                            </template>
                        </v-select>
                        <v-text-field
                            variant="outlined"
                            density="compact"
                            type="number"
                            v-model="gasPrice"
                            label="Gas Price (wei)">
                        </v-text-field>
                        <v-text-field
                            variant="outlined"
                            density="compact"
                            type="number"
                            hide-details="auto"
                            v-model="gasLimit"
                            label="Maximum Gas">
                        </v-text-field>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
    </div>
</template>
<script>
import { mapStores } from 'pinia';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useUserStore } from '../stores/user';
import { useExplorerStore } from '../stores/explorer';

import Metamask from './Metamask';

export default {
    name: 'ContractCallOptions',
    props: ['accounts', 'loading'],
    components: {
        Metamask
    },
    data: () => ({
        from: null,
        gasLimit: '100000',
        gasPrice: null,
        mode: 'accounts'
    }),
    mounted() {
        if (!this.accounts.length)
            return this.mode = 'metamask';

        this.initAccountMode();
    },
    methods: {
        initAccountMode() {
            this.gasLimit = this.currentWorkspaceStore.gasLimit;
            this.gasPrice = this.currentWorkspaceStore.gasPrice;
            if (this.currentWorkspaceStore.defaultAccount) {
                for (let i = 0; i < this.accounts.length; i++)
                    if (this.accounts[i].address == this.currentWorkspaceStore.defaultAccount)
                        this.from = this.accounts[i];
            }
            else
                this.from = this.accounts[0];

            if (this.from)
                this.$emit('rpcConnectionStatusChanged', { isReady: true, account: this.from.address });

            this.emitCallOptionChanged();
        },
        onRpcConnectionStatusChanged(data) {
            this.$emit('rpcConnectionStatusChanged', data);
        },
        emitCallOptionChanged() {
            const data = this.mode == 'accounts' ?
                { from: this.from, gasLimit: this.gasLimit, gasPrice: this.gasPrice } :
                { from: this.from };

            this.$emit('callOptionChanged', data);
        }
    },
    watch: {
        from() {
            this.emitCallOptionChanged();
        },
        gasLimit() {
            this.emitCallOptionChanged();
        },
        gasPrice() {
            this.emitCallOptionChanged();
        },
        mode() {
            this.$emit('senderSourceChanged', this.mode);
            if (this.mode == 'accounts')
                this.initAccountMode();
        }
    },
    computed: {
        ...mapStores(useCurrentWorkspaceStore, useUserStore, useExplorerStore),
        displayMetamask() {
            return this.mode === 'metamask';
        }
    }
}
</script>
<style scoped>
.underlined {
    text-decoration: underline;
}
</style>
