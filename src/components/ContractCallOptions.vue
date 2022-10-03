<template>
    <div>
        <v-card outlined class="mb-4">
            <v-skeleton-loader v-if="loading" class="col-4" type="list-item-three-line"></v-skeleton-loader>
            <div v-else>
                <v-card-text>
                    <div class="mb-5" v-if="accounts.length">
                        Call Contract With: <a :class="{ underlined: mode != 'accounts' }" @click="mode = 'accounts'">Loaded Accounts</a> | <a :class="{ underlined: mode != 'metamask' }" @click="mode = 'metamask'">Metamask</a>
                    </div>
                    <Metamask v-if="displayMetamask" @rpcConnectionStatusChanged="onRpcConnectionStatusChanged"></Metamask>
                    <v-row v-else>
                        <v-col cols="5">
                            <v-select
                                outlined
                                dense
                                label="Select from address"
                                v-model="options.from"
                                item-text="address"
                                :items="accounts"
                                return-object>
                                <template v-slot:item="{ item }">
                                    <v-icon small class="mr-1" v-if="item.privateKey">mdi-lock-open-outline</v-icon>
                                    {{ item.address }}
                                </template>
                                <template v-slot:selection="{ item }">
                                    <v-icon small class="mr-1" v-if="item.privateKey">mdi-lock-open-outline</v-icon>
                                    {{ item.address }}
                                </template>
                            </v-select>
                            <v-text-field
                                outlined
                                dense
                                type="number"
                                v-model="options.gasPrice"
                                label="Gas Price (wei)">
                            </v-text-field>
                            <v-text-field
                                outlined
                                dense
                                type="number"
                                hide-details="auto"
                                v-model="options.gasLimit"
                                label="Maximum Gas">
                            </v-text-field>
                        </v-col>
                    </v-row>
                </v-card-text>
            </div>
        </v-card>
    </div>
</template>
<script>
import { mapGetters } from 'vuex';
import Metamask from './Metamask';

export default {
    name: 'ContractCallOptions',
    props: ['accounts', 'loading'],
    components: {
        Metamask
    },
    data: () => ({
        options: {
            from: null,
            gasLimit: '100000',
            gasPrice: null
        },
        mode: 'accounts'
    }),
    mounted() {
        if (!this.accounts.length)
            return this.mode = 'metamask';

        this.$emit('rpcConnectionStatusChanged', this.mode);
        this.options.gasLimit = this.currentWorkspace.gasLimit;
        this.options.gasPrice = this.currentWorkspace.gasPrice;
        if (this.currentWorkspace.defaultAccount)
            for (let i = 0; i < this.accounts.length; i++)
                if (this.accounts[i].address == this.currentWorkspace.defaultAccount)
                    this.options.from = this.accounts[i];
        else
            this.options.from = this.accounts[0];
    },
    methods: {
        onRpcConnectionStatusChanged(data) {
            this.$emit('rpcConnectionStatusChanged', data);
        }
    },
    watch: {
        mode() {
            this.$emit('senderSourceChanged', this.mode);
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace',
            'isPublicExplorer'
        ]),
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
