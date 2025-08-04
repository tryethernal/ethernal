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
                        <Formatted-Sol-Var v-for="(el, idx) in val" :key="idx" :input="el.input" :value="el.value" />
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
    
    // If we have multiple outputs, each output corresponds to an element in the result array
    if (props.method.outputs.length > 1) {
        const resultArray = Array.isArray(result) ? result : [result];
        for (let i = 0; i < props.method.outputs.length; i++) {
            const output = processOutputRecursive(resultArray[i], props.method.outputs[i]);
            processed.push(output);
        }
    } else {
        // If we have only one output, check if it's an array type
        const outputType = props.method.outputs[0];
        const isArrayType = outputType.type && (outputType.type.endsWith('[]') || outputType.type === 'tuple[]');
        
        if (isArrayType) {
            // If the output type is an array, ensure result is treated as an array
            const resultArray = Array.isArray(result) ? result : [result];
            const output = processOutputRecursive(resultArray, outputType);
            processed.push(output);
        } else {
            // If the output type is not an array, treat result as a single value
            const output = processOutputRecursive(result, outputType);
            processed.push(output);
        }
    }

    return processed;
};

const processOutputRecursive = (value, outputType) => {
    // Handle tuple arrays (e.g., tuple[])
    if (outputType.type === 'tuple[]') {
        if (!Array.isArray(value)) {
            value = [value];
        }
        return value.map((el) => ({
            input: { type: 'tuple', components: outputType.components },
            value: el
        }));
    }
    
    // Handle regular arrays (e.g., uint256[], address[])
    if (outputType.type && outputType.type.endsWith('[]')) {
        if (!Array.isArray(value)) {
            value = [value];
        }
        return value.map((el) => ({
            input: { type: outputType.type.slice(0, -2) }, // Remove '[]' suffix
            value: el
        }));
    }
    
    // Handle tuples
    if (outputType.type === 'tuple') {
        if (!outputType.components) {
            return [{
                input: outputType,
                value: value
            }];
        }
        
        // For tuples, we need to process each component
        const processedComponents = [];
        for (let i = 0; i < outputType.components.length; i++) {
            const component = outputType.components[i];
            const componentValue = value && value[i] !== undefined ? value[i] : null;
            
            // Recursively process nested structures
            const processed = processOutputRecursive(componentValue, component);
            processedComponents.push(...processed);
        }
        return processedComponents;
    }
    
    // Handle nested arrays within tuples (e.g., tuple with array components)
    if (outputType.arrayChildren) {
        if (Array.isArray(value)) {
            return value.map((el) => ({
                input: outputType.arrayChildren,
                value: el
            }));
        } else {
            return [{
                input: outputType.arrayChildren,
                value: value
            }];
        }
    }
    
    // Handle base types (uint256, address, string, etc.)
    return [{
        input: outputType,
        value: value
    }];
};

const callMethod = async () => {
    try {
        loading.value = true;
        error.value = null;
        results.value = [];

        if (Object.keys(params.value).length < props.method.inputs.length) {
            error.value = 'All parameters are required';
            return;
        }

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

        console.log(res)

        console.log(processResult(res));

        results.value = processResult(res);
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
