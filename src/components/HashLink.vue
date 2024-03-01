<template>
    <span>
        <v-tooltip top v-if="verified">
            <template v-slot:activator="{on, attrs}">
                <v-icon v-bind="attrs" v-on="on" class="success--text mr-1" small>mdi-check-circle</v-icon>
            </template>
            Verified contract.
        </v-tooltip>
        <router-link v-if="hash && !unlink" :to="link()">{{ name }}</router-link>
        <template v-else>{{ name }}</template>
        <span v-if="tokenId">
            &nbsp;(<router-link :to="`/address/${hash}/${tokenId}`">#{{ tokenId }}</router-link>)
        </span>
        <span v-if="hash && !copied && !notCopiable">
            &nbsp;<v-icon @click="copyHash()" x-small>mdi-content-copy</v-icon><input type="hidden" :id="`copyElement-${hash}`" :value="hash">
        </span>
        <span v-if="copied">
            &nbsp; <v-icon x-small>mdi-check</v-icon>
        </span>
    </span>
</template>
<script>
const { sanitize } = require('../lib/utils');

export default {
    name: 'HashLink',
    props: ['type', 'hash', 'fullHash', 'withName', 'notCopiable', 'withTokenName', 'xsHash', 'tokenId', 'unlink', 'contract'],
    data: () => ({
        copied: false,
        token: null,
        contractName: null,
        verified: false
    }),
    watch: {
        hash: {
            immediate: true,
            handler(hash) {
                if (!hash)
                    return;

                if (this.withName)
                    if (hash == '0x0000000000000000000000000000000000000000')
                        return this.contractName = 'Black Hole';

                if (this.contract) {
                    if (this.contract.tokenName || this.contract.tokenSymbol)
                        this.token = sanitize({
                            name: this.contract.tokenName,
                            symbol: this.contract.tokenSymbol
                        });
                    this.verified = !!this.contract.verification;
                    this.contractName = this.contract.name;
                }
                else {
                    this.server.getContract(hash)
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
        formattedHash() {
            if (!this.hash) return;
            if (this.fullHash) {
                return this.hash;
            }
            else if (this.xsHash) {
                return `${this.hash.slice(0, 5)}...${this.hash.slice(-4)}`;
            }
            else {
                return `${this.hash.slice(0, 8)}...${this.hash.slice(-4)}`;
            }
        },
        name() {
            if (this.withName) {
                if (this.token && this.withTokenName) {
                    if (this.token.symbol && !this.withTokenName) return this.token.symbol;
                    if (this.token.name) return this.token.name;
                }
                return this.contractName ? this.contractName : this.formattedHash;
            }
            return this.formattedHash;
        }
    },
    methods: {
        link() { return `/${[this.type, this.hash].join('/')}`; },
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
