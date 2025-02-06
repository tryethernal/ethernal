<template>
<v-dialog v-model="dialog" max-width="600">
    <v-card>
        <v-card-title class="text-h5">Transfer {{ token.attributes.name }}</v-card-title>
        <v-form v-model="validForm">
            <v-card-text>
                <v-alert class="mb-3" density="compact" type="success" v-if="successMessage" v-html="successMessage"></v-alert>
                <v-alert class="mb-3" density="compact" type="error" v-if="errorMessage" v-html="errorMessage"></v-alert>
                <v-alert class="mb-3" density="compact" type="warning" v-if="invalidOwner && isPublicExplorer">The connected account is not the owner of this token.</v-alert>
                <v-alert class="mb-3" density="compact" v-if="!successMessage && !errorMessage && !isPublicExplorer && !invalidOwner" type="info">This will only work if your node supports <code>hardhat_impersonateAccount</code> or <code>evm_unlockUnknownAccount</code>.</v-alert>

                <div>Owner: <Hash-Link :type="'address'" :fullHash="true" :hash="token.owner"></Hash-Link></div>
                <div v-if="connectedAddress">Connected account: <Hash-Link :type="'address'" :fullHash="true" :hash="connectedAddress"></Hash-Link></div>
                <WalletConnectorMirror v-else prepend-icon="mdi-wallet" rounded size="small" variant="outlined" />
                <v-text-field
                    v-model="recipient"
                    :rules="[v => !!v && v.length == 42 || 'Invalid address (must be 42 characters long)']"
                    small
                    variant="outlined"
                    density="compact"
                    prepend-inner-icon="mdi-arrow-right"
                    class="mt-5"
                    id="recipient"
                    label="Recipient Address">
                </v-text-field>
                <span class="align-right" v-if="transaction.hash">
                    Transaction:
                    <v-progress-circular v-if="transaction.hash && transaction.receipt.status === undefined" class="mr-2" size="16" width="2" indeterminate color="primary"></v-progress-circular>
                    <template v-else>
                        <v-icon size="small" v-show="transaction.receipt.status" color="success-lighten-1" class="mr-1 align-with-text">mdi-check-circle</v-icon>
                        <v-icon size="small" v-show="!transaction.receipt.status" color="error-lighten-1" class="mr-1 align-with-text">mdi-alert-circle</v-icon>
                    </template>
                    <Hash-Link :type="'transaction'" :hash="transaction.hash"></Hash-Link>
                </span>
            </v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click.stop="close()">Close</v-btn>
                <v-btn v-if="isPublicExplorer" id="transferToken" variant="flat" :disabled="!validForm || invalidOwner" :loading="loading" @click.stop="transferWithInjectedWallet()">Transfer Token</v-btn>
                <v-btn v-else id="transferToken" variant="flat" :disabled="!validForm" :loading="loading" @click.stop="transferToken()">Transfer Token</v-btn>
            </v-card-actions>
        </v-form>
    </v-card>
</v-dialog>
</template>
<script>
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { writeContract } from '@web3-onboard/wagmi';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import { useWalletStore } from '@/stores/walletStore';
import ERC721_ABI from '../abis/erc721.json';
import HashLink from './HashLink.vue';
import WalletConnectorMirror from './WalletConnectorMirror.vue';

export default {
    name: 'ERC721TokenTransferModal',
    props: ['address', 'token'],
    components: {
        HashLink,
        WalletConnectorMirror
    },
    data: () => ({
        validForm: false,
        dialog: false,
        resolve: null,
        reject: null,
        errorMessage: null,
        loading: false,
        transaction: {
            receipt: {}
        },
        didTransfer: false
    }),
    setup() {
        const currentWorkspaceStore = useCurrentWorkspaceStore();
        const walletStore = useWalletStore();
        const { rpcServer, public: isPublicExplorer } = currentWorkspaceStore;
        const { wagmiConfig } = storeToRefs(currentWorkspaceStore);
        const { wagmiConnector, connectedAddress } = storeToRefs(walletStore);

        const successMessage = ref(null);

        const recipient = ref(null);
        const options = ref({});

        const invalidOwner = computed(() => !options.value.token || connectedAddress.value !== options.value.token.owner);

        function transferWithInjectedWallet() {
            writeContract(wagmiConfig.value, {
                abi: ERC721_ABI,
                address: options.value.address,
                functionName: 'safeTransferFrom',
                args: [connectedAddress.value, recipient.value, options.value.token.tokenId],
                connector: wagmiConnector.value,
                account: connectedAddress.value
            })
            .then(hash => successMessage.value = `Transfer transaction sent: <a class="white--text" href="/transaction/${hash}">${hash}</a>`)
            .catch(console.error);
        }

        return { rpcServer, isPublicExplorer, wagmiConfig, wagmiConnector, transferWithInjectedWallet, recipient, options, connectedAddress, invalidOwner, successMessage };
    },
    methods: {
        transferToken() {
            this.loading = true;
            this.successMessage = null;
            this.errorMessage = null;

            this.$server.impersonateAccount(this.rpcServer, this.token.owner)
                .then(hasBeenUnlocked => {
                    if (!hasBeenUnlocked)
                        throw new Error("Transfer failed. Couldn't unlock owner account.");

                    this.$server.transferErc721Token(this.rpcServer, this.address, this.token.owner, this.recipient, this.token.tokenId)
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
            this.validForm = false;
            this.didTransfer = false;
            this.rpcConnectionStatus = false;
            this.invalidOwner = false;
            this.recipient = null;
            this.successMessage = null;
            this.errorMessage = null;
            this.loading = false;
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
        }
    }
}
</script>
