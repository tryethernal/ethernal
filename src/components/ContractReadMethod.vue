<template>
    <div>
        <div class="pb-1 font-weight-bold">{{ method.name }}</div>
        <v-text-field
            variant="outlined"
            density="compact"
            hide-details="auto"
            class="py-1 col-3"
            width="50%"
            v-model="params[inputIdx]"
            v-for="(input, inputIdx) in method.inputs"
            :key="inputIdx"
            :label="inputSignature(input)">
        </v-text-field>
        <div>=> {{ outputSignature }}</div>
        <div id="call" v-show="results.length">
            <v-card v-for="(val, idx) in results" :key="idx" class="my-1">
                <v-card-text class="py-2 ma-0 px-1">
                    <div style="white-space: pre;">
                        <Formatted-Sol-Var :input="val.input" :value="val.value" />
                    </div>
                </v-card-text>
            </v-card>
        </div>
        <div id="call" class="bg-grey-lighten-3 pa-2" v-show="error">
            {{ error }}
        </div>
        <v-btn id="query" :loading="loading" class="mt-1" @click="callMethod">Query</v-btn>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { readContract } from '@web3-onboard/wagmi';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import { processMethodCallParam } from '@/lib/utils';
import FormattedSolVar from './FormattedSolVar.vue';

// Props
const props = defineProps({
    method: { type: Object, required: true },
    contract: { type: Object, required: true }
});

// Store
const currentWorkspaceStore = useCurrentWorkspaceStore();

// Reactive state
const params = ref({});
const results = ref([]);
const error = ref(null);
const loading = ref(false);

// Methods
const inputSignature = (input) => {
    if (input.type === 'tuple') {
        return `${input.name ? input.name : 'tuple'}(${input.components.map((cpt) => `${cpt.type}${cpt.name ? ` ${cpt.name}` : ''}`).join(', ')})`;
    }
    return `${input.type}${input.name ? ` ${input.name}` : ''}`;
};

const processResult = (result) => {
    const processed = [];
    if (props.method.outputs[0].baseType === 'array') {
        processed.push({
            input: props.method.outputs[0],
            value: result
        });
    } else {
        for (let i = 0; i < result.length; i++) {
            processed.push({
                input: props.method.outputs[i],
                value: result[i]
            });
        }
    }
    return processed;
};

const callMethod = async () => {
    try {
        loading.value = true;
        error.value = null;
        results.value = [];

        const processedParams = {};
        for (let i = 0; i < props.method.inputs.length; i++) {
            processedParams[i] = processMethodCallParam(params.value[i], props.method.inputs[i].type);
        }

        const res = await readContract(currentWorkspaceStore.wagmiConfig, {
            address: props.contract.address,
            abi: props.contract.abi,
            functionName: props.method.name,
            args: Object.values(processedParams)
        });

        results.value = Array.isArray(res) ? processResult(res) : processResult([res]);
    } catch (err) {
        console.log(JSON.stringify(err, null, 2));
        const message = err.shortMessage || err.message || err.reason;
        error.value = message ? `Error: ${message}` : 'Error while calling the method';
    } finally {
        loading.value = false;
    }
};

// Computed
const outputSignature = computed(() => {
    const res = [];
    const outputs = props.method.outputs;
    for (let i = 0; i < outputs.length; i++) {
        if (outputs[i].type === 'tuple') {
            res.push(`${outputs[i].name ? outputs[i].name : 'tuple'}(${outputs[i].components.map((cpt) => `${cpt.type}${cpt.name ? ` ${cpt.name}` : ''}`).join(', ')})`);
        } else {
            res.push(`${outputs[i].type}${outputs[i].name ? `: ${outputs[i].name}` : ''}`);
        }
    }
    return res.join(', ');
});
</script>
