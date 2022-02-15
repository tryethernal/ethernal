<template>
    <v-row>
        <template v-if="step.depth > 1">
            <v-col v-for="(n, idx) in new Array(step.depth)" :key="idx" cols="1">
            </v-col>
        </template>
        <v-col class="pb-0" style="overflow-y: auto;" :key="step.depth">
            |<br>
            |-->
            <v-chip small class="primary mr-2">
                {{ this.step.op }}
            </v-chip>
            <Hash-Link :type="'address'" :hash="this.step.address" :fullHash="true" :withName="true" :withTokenName="true" />
            <div class="ml-2" v-if="this.transactionDescription">
                <small style="white-space: pre">{{ formattedTransactionDescription }}</small>
            </div>
        </v-col>
    </v-row>
</template>
<script>
import { ethers } from 'ethers';

import HashLink from './HashLink';

export default {
    name: 'TraceStep',
    components: {
        HashLink
    },
    props: ['step'],
    data: () => ({
        transactionDescription: null,
        jsonInterface: null,
        contract: null
    }),
    methods: {
        zeroXify: function(input) { return input.startsWith('0x') ? input : `0x${input}` },
        decodeInput: function() {
            this.jsonInterface = new ethers.utils.Interface(this.contract.abi);
            this.transactionDescription = this.jsonInterface.parseTransaction({ data: this.zeroXify(this.step.input) });
        }
    },
    watch: {
        'step.contract.abi': {
            immediate: true,
            handler() {
                if (this.step.input && this.step.contract.abi) {
                    try {
                        this.contract = this.step.contract;
                        if (this.contract.proxy)
                            this.$bind('contract', this.db.collection('contracts').doc(this.contract.proxy)).then(this.decodeInput);
                        else
                            this.decodeInput();
                    } catch(_error) {
                        console.log(_error)
                        console.log(this.step);
                    }
                }
            }
        }
    },
    computed: {
        formattedTransactionDescription: function() {
            if (!this.transactionDescription) return '';
            const label = [];
            label.push(`${this.transactionDescription.functionFragment.name}(`);

            const inputsLabel = []
            for (let i = 0; i < this.transactionDescription.functionFragment.inputs.length; i++) {
                const input = this.transactionDescription.functionFragment.inputs[i];
                const param = [];
                param.push(input.type)
                if (input.name)
                    param.push(` ${input.name}`);
                if (this.transactionDescription.args[i])
                    param.push(`: ${this.transactionDescription.args[i]}`)
                inputsLabel.push(param.join(''));
            }

            if (inputsLabel.length > 1)
                label.push('\n\t');

            label.push(inputsLabel.join('\n\t'));

            if (inputsLabel.length > 1)
                label.push('\n');
            label.push(')');

            const outputsLabel = [];
            if (this.transactionDescription.functionFragment.outputs.length > 0 && this.step.returnData) {
                const result = this.jsonInterface.decodeFunctionResult(this.transactionDescription.functionFragment, this.zeroXify(this.step.returnData));

                label.push('\n\t => (');
                for (let i = 0; i < this.transactionDescription.functionFragment.outputs.length; i++) {
                    const output = this.transactionDescription.functionFragment.outputs[i];
                    const param = [];
                    param.push(output.type)
                    if (output.name)
                        param.push(` ${output.name}`);
                    if (result[i]) {
                        param.push(`: ${result[i]}`)
                    }
                    outputsLabel.push(param.join(''));
                }

                if (outputsLabel.length > 1)
                    label.push('\n\t\t');

                label.push(outputsLabel.join('\n\t\t'));

                if (outputsLabel.length > 1)
                    label.push('\n\t');

                label.push(')');
            }
            return label.join('');
        },
        contractName: function() {
            return this.step.contract.name ? `(${this.step.contract.name})` : '';
        }
    }

};
</script>
