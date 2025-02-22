<template>
    <span>
        <v-tooltip location="top" v-if="verified">
            <template v-slot:activator="{props}">
                <v-icon v-bind="props" class="text-success mr-1" size="small">mdi-check-circle</v-icon>
            </template>
            Verified contract.
        </v-tooltip>
        <template v-if="hash && !unlink">
            <a v-if="embedded" :href="externalLink" target="_blank">{{ name }}</a>
            <router-link v-else :to="link">{{ name }}</router-link>
        </template>
        <template v-else>{{ name }}</template>
        <span v-if="tokenId">
            &nbsp;(<router-link :to="`/address/${hash}/${tokenId}`">#{{ tokenId }}</router-link>)
        </span>
        <span v-if="hash && !copied && !notCopiable">
            &nbsp;<v-icon class="text-medium-emphasis" @click="copyHash()" size="x-small">mdi-content-copy</v-icon><input type="hidden" :id="`copyElement-${hash}`" :value="alternateLink && showAlternateLink ? alternateLink : hash">
        </span>
        <span v-if="copied">
            &nbsp; <v-icon class="text-medium-emphasis" size="x-small">mdi-check</v-icon>
        </span>
        <span v-if="alternateLink">
            &nbsp; <v-icon class="text-medium-emphasis" size="x-small" @click="showAlternateLink = !showAlternateLink">mdi-swap-horizontal</v-icon>
        </span>
    </span>
</template>
<script>
import { inject } from 'vue';
import { mapStores } from 'pinia';
import { useExplorerStore } from '../stores/explorer';
import { useCustomisationStore } from '../stores/customisation';
import { sanitize } from '../lib/utils';

export default {
    name: 'HashLink',
    props: ['type', 'hash', 'fullHash', 'withName', 'notCopiable', 'withTokenName', 'xsHash', 'tokenId', 'unlink', 'contract', 'customLabel', 'loadContract'],
    data: () => ({
        copied: false,
        token: null,
        contractName: null,
        verified: false,
        alternateLink: null,
        showAlternateLink: false
    }),
    setup() {
        const isEmbedded = inject('isEmbedded', false);
        return { embedded: !!isEmbedded };
    },
    mounted() {
        if (this.type == 'address')
            this.setupAlternateLink();
    },
    watch: {
        hash: {
            immediate: true,
            handler(hash) {
                if (!hash)
                    return;

                if (this.withName)
                    if (hash == '0x0000000000000000000000000000000000000000')
                        return this.contractName = 'Black Hole';

                if (this.withName != false && this.explorerStore.faucet && this.hash == this.explorerStore.faucet.address)
                    return this.verified = true;

                if (this.contract) {
                    if (this.contract.tokenName || this.contract.tokenSymbol)
                        this.token = sanitize({
                            name: this.contract.tokenName,
                            symbol: this.contract.tokenSymbol
                        });
                    this.verified = !!this.contract.verification;
                    this.contractName = this.contract.name;
                }
                else if (this.loadContract) {
                    this.$server.getContract(hash)
                        .then(({ data }) => {
                            if (data) {
                                if (data.tokenName || data.tokenSymbol)
                                    this.token = sanitize({
                                        name: data.tokenName,
                                        symbol: data.tokenSymbol
                                    });
                                this.verified = !!data.verification;
                                this.contractName = data.name;
                            }
                        })
                }
            }
        }
    },
    computed: {
        ...mapStores(useExplorerStore, useCustomisationStore),
        formattedHash() {
            if (this.alternateLink && this.showAlternateLink)
                return this.formatHash(this.alternateLink);
            else
                return this.formatHash(this.hash);
        },
        name() {
            if (this.alternateLink && this.showAlternateLink)
                return this.formatHash(this.alternateLink);
            else if (this.customLabel)
                return this.customLabel;
            if (this.withName != false && this.explorerStore.faucet && this.hash == this.explorerStore.faucet.address)
                return `${this.explorerStore.token || 'ETH'} faucet`;
            if (this.withName) {
                if (this.token && this.token.symbol && !this.withTokenName) return this.token.symbol;
                if (this.token && this.token.name && this.withTokenName) return this.token.name;
                return this.contractName ? this.contractName : this.formattedHash;
            }
            return this.formattedHash;
        },
        link() { return `/${[this.type, this.hash].join('/')}`; },
        externalLink() { return `//${this.explorerStore.domain}/${[this.type, this.hash].join('/')}`; }
    },
    methods: {
        setupAlternateLink() {
            this.customisationStore.alternateLink(this.hash)
                .then(result => {
                    this.alternateLink = result;
                    if (!result) {
                        let unsubscribe = this.customisationStore.$subscribe((mutation, state) => {
                            if (state.worker) {
                                unsubscribe();
                                this.setupAlternateLink();
                            }
                        });
                    }
                });
        },
        formatHash(hash) {
            if (!hash) return;
            if (this.fullHash) return hash;
            else if (this.xsHash) return `${hash.slice(0, 5)}...${hash.slice(-4)}`;
            else return `${hash.slice(0, 8)}...${hash.slice(-4)}`;
        },
        copyHash() {
            const webhookField = document.querySelector(`#copyElement-${this.hash}`);
            webhookField.setAttribute('type', 'text');
            webhookField.select();

            try {
                document.execCommand('copy');
                this.copied = true;
                setTimeout(() => this.copied = false, 1000);
            } catch(error) {
                alert(`Couldn't copy hash`);
            } finally {
                webhookField.setAttribute('type', 'hidden');
                window.getSelection().removeAllRanges();
            }
        },
    }
}
</script>
