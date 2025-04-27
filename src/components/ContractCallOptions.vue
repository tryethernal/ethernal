<template>
    <div>
        <v-alert density="compact" type="info" text class="mb-3" v-if="!accounts.length && envStore.isAdmin">
            To call contracts with loaded accounts, go to the "Accounts" tab and sync them from your chain, or add them using a private key or the impersonification feature.
        </v-alert>
        <div class="mb-5" v-if="accounts.length">
            Call Contract With: <a :class="{ underlined: mode != 'accounts' }" @click="mode = 'accounts'">Loaded Accounts</a> | <a :class="{ underlined: mode != 'metamask' }" @click="mode = 'metamask'">Metamask</a>
        </div>
        <template v-if="displayMetamask">
            <template v-if="connectedAddress">
                <b>Connected account:</b> <Hash-Link :type="'address'" :fullHash="true" :hash="connectedAddress"></Hash-Link>
            </template>
            <WalletConnectorMirror v-else prepend-icon="mdi-wallet" size="small" variant="outlined" />
        </template>
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
                    <template v-slot:item="{ props, item }">
                        <v-list-item v-bind="props" :subtitle="item.address">
                            <template v-slot:prepend>
                                <v-icon size="small" v-if="item.raw.privateKey">mdi-lock-open-outline</v-icon>
                            </template>
                        </v-list-item>
                    </template>
                    <template v-slot:selection="{ item }">
                        <v-icon size="small" v-if="item.raw.privateKey">mdi-lock-open-outline</v-icon>
                        {{ item.raw.address }}
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
    </div>
</template>
<script>
import { mapStores, storeToRefs } from 'pinia';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useWalletStore } from '../stores/walletStore';
import { useEnvStore } from '../stores/env';

import WalletConnectorMirror from './WalletConnectorMirror.vue';
import HashLink from './HashLink.vue';

export default {
    name: 'ContractCallOptions',
    components: {
        WalletConnectorMirror,
        HashLink
    },
    props: ['accounts', 'loading'],
    data: () => ({
        from: null,
        gasLimit: '100000',
        gasPrice: null,
        mode: 'accounts'
    }),
    setup() {
        const walletStore = useWalletStore();
        const { connectedAddress } = storeToRefs(walletStore);

        return { connectedAddress };
    },
    mounted() {
        if (!this.accounts.length)
            return this.mode = 'metamask';

        this.initAccountMode();
        this.$emit('senderSourceChanged', this.mode);
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
        ...mapStores(useCurrentWorkspaceStore, useEnvStore),
        displayMetamask() {
            return this.mode === 'metamask';
        }
    }
}
</script>
<style scoped>
.underlined {
    text-decoration: underline;
    cursor: pointer;
}
</style>
