<template>
    <div>
        <v-card class="mb-4">
            <v-card-text>
                <v-icon size="small" class="mr-1" color="success" icon="mdi-check-circle"></v-icon>
                <span v-tooltip="'The contract source code has been verified to match its on-chain bytecode. This doesn\'t mean the contract is safe to interact with.'" class="font-weight-bold">Contract Source Code Verified</span>
                <v-row class="mt-3">
                    <v-col cols="6"><b>Contract Name:</b> {{ contract.verification.contractName }}</v-col>
                    <v-col cols="6">
                        <b>Optimizer:</b> <span v-if="contract.verification.runs"><b>Yes</b> with <b>{{ contract.verification.runs }}</b> runs</span>
                        <span v-else>No</span>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col cols="6"><b>Compiler Version:</b> {{ contract.verification.compilerVersion }}</v-col>
                    <v-col cols="6"><b>EVM Version:</b> {{ contract.verification.evmVersion }}</v-col>
                </v-row>
                <v-divider class="my-4"></v-divider>
                <ContractCodeEditor :sources="contract.verification.sources" />
            </v-card-text>
        </v-card>

        <template v-if="displayConstructorArguments">
            <h4>Constructor Arguments</h4>
            <v-card class="mb-6">
                <v-card-title>
                    <span class="text-caption">
                        <a :class="{ underlined: !formattedConstructorArguments }" @click="formattedConstructorArguments = true">Formatted</a> | <a :class="{ underlined: formattedConstructorArguments }" @click="formattedConstructorArguments = false">Raw</a>
                    </span>
                </v-card-title>
                <v-card-text>
                    <template v-if="formattedConstructorArguments">
                        <div v-for="(arg, idx) in decodedConstructorArguments" :key="idx" style="white-space: pre;">
                            <Formatted-Sol-Var :input="arg" :value="arg.value" />
                        </div>
                    </template>
                    <span v-else>{{ zeroXifiedConstructorArguments }}</span>
                </v-card-text>
            </v-card>
        </template>

        <template v-if="displayLibraries">
            <h4>Libraries</h4>
            <v-card class="mb-6">
                <v-card-text>
                    <div v-for="(libraryName, idx) in Object.keys(contract.verification.libraries)" :key="idx">
                        {{ libraryName }} => {{ contract.verification.libraries[libraryName] }}
                    </div>
                </v-card-text>
            </v-card>
        </template>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import FormattedSolVar from './FormattedSolVar.vue';
import ContractCodeEditor from './ContractCodeEditor.vue';
const ethers = require('ethers');

// Props
const props = defineProps({
    contract: {
        type: Object,
        required: true
    }
});

// Reactive state
const formattedConstructorArguments = ref(true);

// Methods
const copyAbi = () => {
    const webhookField = document.querySelector('#copyAbi');
    webhookField.setAttribute('type', 'text');
    webhookField.select();

    try {
        const copied = document.execCommand('copy');
        const message = copied ? 'ABI copied!' : `Couldn't copy ABI`;
        alert(message);
    } catch(error) {
        alert(`Couldn't copy ABI`);
    } finally {
        webhookField.setAttribute('type', 'hidden');
        window.getSelection().removeAllRanges();
    }
};

// Computed properties
const zeroXifiedConstructorArguments = computed(() => {
    return props.contract.verification.constructorArguments.startsWith('0x') ?
        props.contract.verification.constructorArguments :
        `0x${props.contract.verification.constructorArguments}`;
});

const decodedConstructorArguments = computed(() => {
    const iface = new ethers.utils.Interface(props.contract.abi);
    const constructorInputs = JSON.parse(iface.deploy.format(ethers.utils.FormatTypes.json)).inputs;

    /*
        This won't handle well tuples in tuples, but hopefully it'll be good enough for now.
        I'd say that I'll improve later, but we all know it's probably never going to happen
    */
    const decodedInputs = ethers.utils.defaultAbiCoder.decode(iface.deploy.inputs.map(i => {
        if (i.type == 'tuple')
            return `tuple(${i.components.map(c => c.type).join(',')})`;
        else
            return i.type;
    }), zeroXifiedConstructorArguments.value);
    
    const decoded = [];
    for (let i = 0; i < decodedInputs.length; i++) {
        decoded.push({
            ...constructorInputs[i],
            value: decodedInputs[i]
        });
    }
    return decoded;
});

const displayConstructorArguments = computed(() => {
    return props.contract.verification && props.contract.verification.constructorArguments;
});

const displayLibraries = computed(() => {
    return props.contract.verification && props.contract.verification.libraries && Object.keys(props.contract.verification.libraries).length > 0;
});
</script>

<style scoped>
.underlined {
    text-decoration: underline;
}
</style>
