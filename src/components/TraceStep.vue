<template>
    <v-row>
        <template v-if="step.depth > 1">
            <v-col v-for="(n, idx) in new Array(step.depth)" :key="idx" cols="1">
            </v-col>
        </template>
        <v-col class="pb-0" :key="step.depth">
            |<br>
            |-->
            <v-chip small class="primary mr-2">
                {{ this.step.op }}
            </v-chip>
            <Hash-Link :hash="this.step.address" :type="'address'" /> {{ this.contractName }}
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
        transactionDescription: null
    }),
    watch: {
        'step.contract.abi': {
            handler() {
                if (this.step.input) {
                    const jsonInterface = new ethers.utils.Interface(this.step.contract.abi);
                    this.transactionDescription = jsonInterface.parseTransaction({ data: `0x${this.step.input}` });
                }
            }
        }

    },
    computed: {
        formattedTransactionDescription: function() {
            if (!this.transactionDescription) return '';
            const label = [];
            label.push(`${this.transactionDescription.functionFragment.name}(`);

            const params = []
            for (const input of this.transactionDescription.functionFragment.inputs) {
                const param = [];
                param.push(input.type)
                if (input.name)
                    param.push(` ${input.name}`);
                if (this.transactionDescription.args[input.name])
                    param.push(`: ${this.transactionDescription.args[input.name]}`)
                params.push(param.join(''));
            }
            if (params.length > 1)
                label.push('\n\t');

            label.push(params.join('\n\t'));

            if (params.length > 1)
                label.push('\n');
            label.push(')');
            return label.join('');
        },
        contractName: function() {
            return this.step.contract.name ? `(${this.step.contract.name})` : '';
        }
    }

};
</script>
