<template>
<v-dialog v-model="dialog" max-width="600">
    <v-card>
        <v-card-title class="text-h5">Transfer {{ options.token?.attributes?.name || '' }}</v-card-title>
        <v-form v-model="validForm">
            <v-card-text>
                <v-alert class="mb-3" density="compact" type="success" v-if="successMessage" v-html="successMessage"></v-alert>
                <v-alert class="mb-3" density="compact" type="error" v-if="errorMessage" v-html="errorMessage"></v-alert>
                <v-alert class="mb-3" density="compact" type="warning" v-if="invalidOwner && isPublicExplorer">The connected account is not the owner of this token.</v-alert>
                <v-alert class="mb-3" density="compact" v-if="!successMessage && !errorMessage && !isPublicExplorer && !invalidOwner" type="info">This will only work if your node supports <code>hardhat_impersonateAccount</code> or <code>evm_unlockUnknownAccount</code>.</v-alert>

                <div>Owner: <Hash-Link :type="'address'" :fullHash="true" :hash="options.token?.owner"></Hash-Link></div>
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
<script setup>
import { ref, computed, inject, defineExpose } from 'vue';
import { storeToRefs } from 'pinia';
import { writeContract } from '@web3-onboard/wagmi';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import { useExplorerStore } from '@/stores/explorer';
import { useWalletStore } from '@/stores/walletStore';
import ERC721_ABI from '../abis/erc721.json';
import HashLink from './HashLink.vue';
import WalletConnectorMirror from './WalletConnectorMirror.vue';

const $server = inject('$server');

const dialog = ref(false);
const validForm = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const loading = ref(false);
const transaction = ref({ receipt: {} });
const didTransfer = ref(false);
const resolveRef = ref(null);
const rejectRef = ref(null);
const recipient = ref(null);
const options = ref({});

const currentWorkspaceStore = useCurrentWorkspaceStore();
const explorerStore = useExplorerStore();
const walletStore = useWalletStore();
const { wagmiConfig } = storeToRefs(currentWorkspaceStore);
const { wagmiConnector, connectedAddress } = storeToRefs(walletStore);
const isPublicExplorer = computed(() => currentWorkspaceStore.public);

const rpcServer = computed(() => {
    // Use explorerStore.rpcServer if it is a non-empty string, otherwise fallback
    return (explorerStore.rpcServer && typeof explorerStore.rpcServer === 'string' && explorerStore.rpcServer.trim())
        ? explorerStore.rpcServer
        : currentWorkspaceStore.rpcServer;
});

const invalidOwner = computed(() => {
    // Always use options.value for token and address
    return !options.value.token || connectedAddress.value !== options.value.token.owner;
});

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

function transferToken() {
    loading.value = true;
    successMessage.value = null;
    errorMessage.value = null;
    // Use options.value for all transfer context
    $server.impersonateAccount(rpcServer.value, options.value.token.owner)
        .then(hasBeenUnlocked => {
            if (!hasBeenUnlocked)
                throw new Error("Transfer failed. Couldn't unlock owner account.");
            $server.transferErc721Token(rpcServer.value, options.value.address, options.value.token.owner, recipient.value, options.value.token.tokenId)
                .then(tx => {
                    transaction.value = { ...tx, receipt: {} };
                    tx.wait().then(receipt => {
                        transaction.value.receipt = receipt;
                        if (receipt.status) {
                            successMessage.value = `Token transferred successfully!`;
                            didTransfer.value = true;
                        } else {
                            console.log(tx, receipt);
                            errorMessage.value = `Transaction failed`;
                        }
                    });
                })
                .catch(error => {
                    console.log(error);
                    errorMessage.value = error.reason || `Error: ${error.message}` || 'Error while sending the transaction. Please reload the page and try again.';
                })
                .finally(() => loading.value = false);
        })
        .catch(error => {
            console.log(error);
            errorMessage.value = error.message || error;
            loading.value = false;
        });
}

function open(opts) {
    dialog.value = true;
    options.value = opts || {};
    return new Promise((resolve, reject) => {
        resolveRef.value = resolve;
        rejectRef.value = reject;
    });
}

function close() {
    if (resolveRef.value) resolveRef.value(didTransfer.value);
    reset();
}

function reset() {
    options.value = {};
    transaction.value = { receipt: {} };
    validForm.value = false;
    didTransfer.value = false;
    recipient.value = null;
    successMessage.value = null;
    errorMessage.value = null;
    loading.value = false;
    dialog.value = false;
    resolveRef.value = null;
    rejectRef.value = null;
}

defineExpose({ open, close });
</script>
