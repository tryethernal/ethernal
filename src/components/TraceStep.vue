<template>
    <v-row>
        <template v-if="step.depth > 1">
            <v-col v-for="(n, idx) in new Array(step.depth)" :key="idx" cols="1">
            </v-col>
        </template>
        <v-col class="pb-0" style="overflow-y: auto;" :key="step.depth">
            <v-card flat>
                <v-card-text class="pa-0 ma-0">
                    <span class="font-weight-black">
                        |<br>
                        |-->
                    </span>
                    <v-chip size="small" class="bg-primary mr-2">{{ step.op }}</v-chip>
                    <v-chip v-if="step.contract && step.contract.proxyContract" size="small" class="bg-primary mr-2">PROXY</v-chip>
                    <template v-if="step.value && step.value != '' && step.value != '0'">[{{ $fromWei(step.value, 'ether', token) }}] </template>
                    <Hash-Link :type="'address'" :hash="step.address" :notCopiable="true" :fullHash="true" :withName="true" :contract="step.contract"/><span v-if="transactionDescription">.{{ transactionDescription.functionFragment.name }}(</span>
                    <template v-if="transactionDescription">
                        <div v-for="(input, index) in transactionDescription.functionFragment.inputs" :key="`in-${index}`">
                            <Formatted-Sol-Var :input="input" :value="transactionDescription.args[index]" class="ml-8" />
                        </div><span class="ml-4">)</span>
                        <template v-if="step.returnData && transactionDescription.functionFragment.outputs.length">
                            <template v-if="transactionDescription.functionFragment.outputs.length > 0">
                                =>
                            </template>
                            <template v-if="transactionDescription.functionFragment.outputs.length > 1 ">
                                (<div v-for="(output, index) in transactionDescription.functionFragment.outputs" :key="`out-${index}`">
                                    <Formatted-Sol-Var  :input="output" :value="decodeOutput(index)" />
                                </div>)
                            </template>
                            <template v-else>
                                <Formatted-Sol-Var :depth="0" :input="transactionDescription.functionFragment.outputs[0]" :value="decodeOutput(0)" />
                            </template>
                        </template>
                    </template>
                    <template v-else-if="step.input || step.returnData">
                        <ul>
                            <li :class="{'raw-input': !expandInput}" v-if="step.input">
                                <b class="mr-2">Input:</b>
                                <a @click="expandInput = true" v-if="!expandInput">[ + ]</a>
                                <a @click="expandInput = false" v-else>[ - ]</a>
                                {{ step.input }}
                            </li>
                            <li :class="{'raw-input': !expandOutput}" v-if="step.returnData">
                                <b class="mr-2">Output:</b>
                                <a @click="expandOutput = true" v-if="!expandOutput">[ + ]</a>
                                <a @click="expandOutput = false" v-else>[ - ]</a>
                                {{ step.returnData }}
                            </li>
                        </ul>
                    </template>
                </v-card-text>
            </v-card>
        </v-col>
    </v-row>
</template>
<script>
import { ethers } from 'ethers';
import { storeToRefs } from 'pinia';

import { useExplorerStore } from '../stores/explorer';

import HashLink from './HashLink.vue';
import FormattedSolVar from './FormattedSolVar.vue';

export default {
    name: 'TraceStep',
    components: {
        HashLink,
        FormattedSolVar
    },
    props: ['step'],
    data: () => ({
        transactionDescription: null,
        outputs: null,
        calledContract: null,
        proxyContract: null,
        expandInput: false,
        expandOutput: false
    }),
    setup() {
        const { token } = storeToRefs(useExplorerStore());
        return { token };
    },
    methods: {
        zeroXify(input) { return input.startsWith('0x') ? input : `0x${input}` },
        decodeOutput(index) {
            if (!this.step.returnData) return '';
            return this.jsonInterface.decodeFunctionResult(this.transactionDescription.functionFragment, this.zeroXify(this.step.returnData))[index];
        }
    },
    computed: {
        jsonInterface() {
            const contract = this.step.contract.proxyContract ? this.step.contract.proxyContract : this.step.contract;
            return new ethers.utils.Interface(contract.abi);
        }
    },
    watch: {
        'step.contract': {
            immediate: true,
            handler() {
                if (!this.step.contract) return;
                if (this.step.input && this.step.contract.abi) {
                    try {
                        this.jsonInterface.parseTransaction({ data: this.zeroXify(this.step.input) });
                    } catch(_error) {
                        console.log(_error)
                    }
                }
            }
        }
    }
};
</script>
<style scoped>
li {
    list-style-type: none;
}
</style>
