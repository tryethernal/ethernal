<template>
<v-dialog v-model="dialog" max-width="600">
    <v-card>
        <v-card-title class="headline">Transfer {{ token.attributes.name }}</v-card-title>

        <v-card-text>
            <v-alert type="success" v-if="successMessage" v-html="successMessage"></v-alert>
            <v-alert type="error" v-if="errorMessage" v-html="errorMessage"></v-alert>
            <v-alert type="error" v-if="invalidOwner">The connected account is not the owner of this token.</v-alert>
            <v-alert v-if="!successMessage && !errorMessage && !isPublicExplorer && !invalidOwner" type="info" text v-html="'This will only work if your node supports either <code>hardhat_impersonateAccount</code> or <code>evm_unlockUnknownAccount</code>.'"></v-alert>

            Owner: <Hash-Link :type="'address'" :fullHash="true" :hash="token.owner"></Hash-Link>
            <v-text-field
                v-model="recipient"
                :rules="[v => !!v && v.length == 42 || 'Invalid address (must be 42 characters long)']"
                small
                outlined
                dense
                prepend-inner-icon="mdi-arrow-right"
                class="mt-3"
                label="Recipient Address">
            </v-text-field>
            <span class="align-right" v-if="transaction.hash">
                Transaction:
                <v-progress-circular v-if="transaction.hash && transaction.receipt.status === undefined" class="mr-2" size="16" width="2" indeterminate color="primary"></v-progress-circular>
                <template v-else>
                    <v-icon small v-show="transaction.receipt.status" color="success lighten-1" class="mr-1 align-with-text">mdi-check-circle</v-icon>
                    <v-icon small v-show="!transaction.receipt.status" color="error lighten-1" class="mr-1 align-with-text">mdi-alert-circle</v-icon>
                </template>
                <Hash-Link :type="'transaction'" :hash="transaction.hash"></Hash-Link>
            </span>
            <Metamask v-if="dialog && isPublicExplorer" class="mt-1" @rpcConnectionStatusChanged="onRpcConnectionStatusChanged"></Metamask>
        </v-card-text>

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click.stop="close()">Close</v-btn>
            <v-btn id="transferToken" color="primary" :disabled="isPublicExplorer && !metamaskData.isReady || invalidOwner" :loading="loading" text @click.stop="transferToken()">Transfer Token</v-btn>
        </v-card-actions>
    </v-card>
</v-dialog>
</template>
<script>
import { mapGetters } from 'vuex';
import ERC721_ABI from '../abis/erc721.json';
import { sendTransaction } from '../lib/metamask';
import HashLink from './HashLink';
import Metamask from './Metamask';

export default {
    name: 'ERC721TokenTransferModal',
    props: ['address', 'token'],
    components: {
        HashLink,
        Metamask
    },
    data: () => ({
        recipient: null,
        dialog: false,
        resolve: null,
        reject: null,
        successMessage: null,
        errorMessage: null,
        loading: false,
        options: {},
        transaction: {
            receipt: {}
        },
        rpcConnectionStatus: false,
        metamaskData: {},
        invalidOwner: false,
        didTransfer: false
    }),
    methods: {
        transferWithMetamask() {
            sendTransaction({
                ethereum: window.ethereum,
                address: this.address,
                abi: ERC721_ABI,
                signature: 'safeTransferFrom(address,address,uint256)',
                params: [this.metamaskData.account, this.recipient, this.token.tokenId],
                options: { value: '0' }
            })
            .then(txHash => {
                this.successMessage = `Transfer transaction sent: <a class="white--text" href="/transaction/${txHash}">${txHash}</a>`;
                this.didTransfer = true;
            })
            .catch(error => this.errorMessage = error.message || error)
            .finally(() => this.loading = false);
        },
        onRpcConnectionStatusChanged(data) {
            this.metamaskData = data;
            this.invalidOwner = data.isReady && this.token.owner !== data.account;
        },
        transferToken() {
            this.loading = true;
            this.successMessage = null;
            this.errorMessage = null;
            if (this.metamaskData.isReady)
                return this.transferWithMetamask();

            this.server.impersonateAccount(this.currentWorkspace.rpcServer, this.token.owner)
                .then(hasBeenUnlocked => {
                    if (!hasBeenUnlocked)
                        throw new Error("Transfer failed. Couldn't unlock owner account.");

                    this.server.transferErc721Token(this.currentWorkspace.rpcServer, this.address, this.token.owner, this.recipient, this.token.tokenId)
                        .then(transaction => {
                            this.transaction = { ...transaction, receipt: {} };
                            transaction.wait().then(receipt => {
                                this.transaction.receipt = receipt;
                                if (receipt.status) {
                                    this.successMessage = `Token transferred successfully!`;
                                    this.didTransfer = true;
                                }
                                else {
                                    console.log(transaction, receipt);
                                    this.errorMessage = `Transaction failed`;
                                }
                            });
                        })
                        .catch(error => {
                            console.log(error);
                            this.errorMessage = error.reason || `Error: ${error.message}` || 'Error while sending the transaction. Please reload the page and try again.';
                        })
                        .finally(() => this.loading = false);
                })
                .catch(error => {
                    console.log(error);
                    this.errorMessage = error.message || error;
                    this.loading = false;
                })
        },
        open(options) {
            this.dialog = true;
            this.options = options || {};
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        close() {
            this.resolve(this.didTransfer);
            this.reset();
        },
        reset() {
            this.options = {};
            this.transaction = {
                receipt: {}
            };
            this.didTransfer = false;
            this.rpcConnectionStatus = false;
            this.metamaskData = {};
            this.invalidOwner = false;
            this.recipient = null;
            this.successMessage = null;
            this.errorMessage = null;
            this.loading = false;
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace',
            'isPublicExplorer'
        ])
    }
}
</script>
