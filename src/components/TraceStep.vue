<template>
    <v-row v-if="step && step.op" class="ma-1 pa-1 pb-0 mb-0">
        <template v-if="step.depth > 1">
            <v-col :class="{'py-0': true, 'border-left': step.depth > 2 && idx == step.depth - 2}" v-for="(n, idx) in new Array(step.depth - 1)" :key="idx" cols="1">
            </v-col>
        </template>
        <v-col class="py-0 my-0" style="overflow-y: auto;" :key="step.depth || 0">
            <v-card border="false">
                <v-card-text class="pa-0 ma-0">
                    <span v-if="step.depth > 1" class="font-weight-black">
                        |<br>
                        |-->
                    </span>
                    <v-chip size="small" class="bg-primary mr-2">{{ step.op || 'UNKNOWN' }}</v-chip>
                    <v-chip v-if="step.contract && step.contract.proxyContract" size="small" class="bg-primary mr-2">PROXY</v-chip>
                    <template v-if="step.value && step.value != '' && step.value != '0'">[{{ $fromWei(step.value, 'ether', token) }}] </template>
                    <Hash-Link v-if="step.address" :type="'address'" :hash="step.address" :notCopiable="true" :fullHash="true" :withName="true" :contract="step.contract"/><span v-if="transactionDescription">.{{ transactionDescription.functionFragment.name }}(</span>
                    <template v-if="transactionDescription && transactionDescription.functionFragment && transactionDescription.functionFragment.inputs">
                        <div v-for="(input, index) in transactionDescription.functionFragment.inputs" :key="`in-${index}`">
                            <Formatted-Sol-Var :input="input" :value="transactionDescription.args ? transactionDescription.args[index] : null" class="ml-8" />
                        </div><span class="ml-4">)</span>
                        <template v-if="step.returnData && transactionDescription.functionFragment.outputs && transactionDescription.functionFragment.outputs.length">
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
                                <span v-if="step.depth > 1" class="font-weight-black">|</span> <b class="mr-2">Input:</b>
                                <a class="no-decoration" href="#" @click.prevent="expandInput = true" v-if="!expandInput">[ + ]</a>
                                <a class="no-decoration" href="#" @click.prevent="expandInput = false" v-else>[ - ]</a>
                                {{ step.input }}
                            </li>
                            <li :class="{'raw-input': !expandOutput}" v-if="step.returnData">
                                <span v-if="step.depth > 1" class="font-weight-black">|</span> <b class="mr-2">Output:</b>
                                <a class="no-decoration" href="#" @click.prevent="expandOutput = true" v-if="!expandOutput">[ + ]</a>
                                <a class="no-decoration" href="#" @click.prevent="expandOutput = false" v-else>[ - ]</a>
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
        zeroXify(input) { 
            if (!input) return '0x';
            return input.startsWith('0x') ? input : `0x${input}`;
        },
        decodeOutput(index) {
            try {
                if (!this.step.returnData || !this.transactionDescription || !this.transactionDescription.functionFragment) return '';
                if (!this.jsonInterface) return '';
                return this.jsonInterface.decodeFunctionResult(this.transactionDescription.functionFragment, this.zeroXify(this.step.returnData))[index];
            } catch (error) {
                console.error('Error decoding output:', error);
                return '';
            }
        }
    },
    computed: {
        jsonInterface() {
            try {
                if (!this.step || !this.step.contract) return null;
                const contract = this.step.contract.proxyContract ? this.step.contract.proxyContract : this.step.contract;
                if (!contract || !contract.abi) return null;
                return new ethers.utils.Interface(contract.abi);
            } catch (error) {
                console.error('Error creating interface:', error);
                return null;
            }
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
