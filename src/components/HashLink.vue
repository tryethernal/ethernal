<template>
    <span>
        <v-tooltip location="top" v-if="verified">
            <template v-slot:activator="{props}">
                <v-icon v-bind="props" class="text-success mr-1" size="small">mdi-check-circle</v-icon>
            </template>
            Verified contract.
        </v-tooltip>
        <template v-if="hash && !unlink">
            <a style="text-decoration: none;" v-if="embedded" :href="externalLink" target="_blank">{{ name }}</a>
            <router-link style="text-decoration: none;" v-else :to="link">{{ name }}</router-link>
        </template>
        <template v-else>{{ name }}</template>
        <span v-if="tokenId">
            &nbsp;(<router-link style="text-decoration: none;" :to="`/address/${hash}/${tokenId}`">#{{ tokenId }}</router-link>)
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

<script setup>
import { ref, computed, inject, watch, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useExplorerStore } from '../stores/explorer';
import { useCustomisationStore } from '../stores/customisation';
import { sanitize } from '../lib/utils';

// Props definition
const props = defineProps({
    type: String,
    hash: String,
    fullHash: Boolean,
    withName: {
        type: Boolean,
        default: true
    },
    notCopiable: Boolean,
    withTokenName: Boolean,
    xsHash: Boolean,
    tokenId: String,
    unlink: Boolean,
    contract: Object,
    customLabel: String,
    loadContract: Boolean
});

// Store setup
const explorerStore = useExplorerStore();
const customisationStore = useCustomisationStore();
const { faucet, token, domain } = storeToRefs(explorerStore);

// Inject server instance
const $server = inject('$server');

// Reactive state
const copied = ref(false);
const tokenData = ref(null);
const contractName = ref(null);
const verified = ref(false);
const alternateLink = ref(null);
const showAlternateLink = ref(false);

// Inject embedded state
const embedded = inject('isEmbedded', false);

// Methods
const setupAlternateLink = async () => {
    if (props.type !== 'address') return;
    
    const result = await customisationStore.alternateLink(props.hash);
    alternateLink.value = result;
    
    if (!result) {
        const unsubscribe = customisationStore.$subscribe((mutation, state) => {
            if (state.worker) {
                unsubscribe();
                setupAlternateLink();
            }
        });
    }
};

const formatHash = (hash) => {
    if (!hash) return;
    if (props.fullHash) return hash;
    if (props.xsHash) return `${hash.slice(0, 5)}...${hash.slice(-4)}`;
    return `${hash.slice(0, 8)}...${hash.slice(-4)}`;
};

const copyHash = () => {
    const webhookField = document.querySelector(`#copyElement-${props.hash}`);
    if (!webhookField) {
        console.warn(`Could not find element with id: copyElement-${props.hash}`);
        return;
    }

    webhookField.setAttribute('type', 'text');
    webhookField.select();

    try {
        document.execCommand('copy');
        copied.value = true;
        setTimeout(() => copied.value = false, 1000);
    } catch(error) {
        console.error(`Couldn't copy hash: ${error}`);
        alert(`Couldn't copy hash`);
    } finally {
        webhookField.setAttribute('type', 'hidden');
        window.getSelection().removeAllRanges();
    }
};

// Computed properties
const formattedHash = computed(() => {
    if (alternateLink.value && showAlternateLink.value) {
        return formatHash(alternateLink.value);
    }
    return formatHash(props.hash);
});

const name = computed(() => {
    if (alternateLink.value && showAlternateLink.value) {
        return formatHash(alternateLink.value);
    }
    if (props.customLabel) {
        return props.customLabel;
    }
    if (props.withName !== false && faucet.value && props.hash === faucet.value.address) {
        return `${token.value || 'ETH'} faucet`;
    }

        if (props.withName) {
        if (tokenData.value?.symbol && !props.withTokenName) return tokenData.value.symbol;
        if (tokenData.value?.name && props.withTokenName) return tokenData.value.name;
        return contractName.value ? contractName.value : formattedHash.value;
    }
    return formattedHash.value;
}); 

const link = computed(() => `/${[props.type, props.hash].join('/')}`);

const externalLink = computed(() => `//${domain.value}/${[props.type, props.hash].join('/')}`);

// Watch for hash changes
watch(() => props.hash, async (hash) => {
    if (!hash) return;

    if (props.withName && hash === '0x0000000000000000000000000000000000000000') {
        contractName.value = 'Black Hole';
        return;
    }

    if (props.withName !== false && faucet.value && hash === faucet.value.address) {
        verified.value = true;
        return;
    }

    if (props.contract) {
        if (props.contract.tokenName || props.contract.tokenSymbol) {
            tokenData.value = sanitize({
                name: props.contract.tokenName,
                symbol: props.contract.tokenSymbol
            });
        }
        verified.value = !!props.contract.verification;
        contractName.value = props.contract.name;
    } else if (props.loadContract) {
        try {
            const { data } = await $server.getContract(hash);
            if (data) {
                if (data.tokenName || data.tokenSymbol) {
                    tokenData.value = sanitize({
                        name: data.tokenName,
                        symbol: data.tokenSymbol
                    });
                }
                verified.value = !!data.verification;
                contractName.value = data.name;
            }
        } catch (error) {
            console.error('Failed to load contract:', error);
        }
    }
}, { immediate: true });

// Lifecycle hooks
onMounted(() => {
    setupAlternateLink();
});
</script>
