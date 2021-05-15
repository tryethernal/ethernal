<template>
    <v-row>
        <v-col cols="1">
            <v-chip small class="primary">
                {{ this.step.op }}
            </v-chip>
        </v-col>
        <v-col>
            {{ this.label }} <Hash-Link :hash="this.step.address" :type="'address'" /> {{ this.contractName }}
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
                    this.transactionDescription = jsonInterface.parseTransaction({ data: this.step.input });
                }
            }
        }

    },
    computed: {
        formattedTransactionDescription: function() {
            if (!this.transactionDescription) return '';
            const label = [];
            label.push(`${this.transactionDescription.functionFragment.name}(\n\t`);

            const params = []
            for (const input of this.transactionDescription.functionFragment.inputs) {
                params.push(`${input.type} ${input.name}: ${this.transactionDescription.args[input.name]}`);
            }
            label.push(params.join('\n\t'));

            label.push('\n)');
            return label.join('');
        },
        contractName: function() {
            return this.step.contract.name ? `(${this.step.contract.name})` : '';
        },
        label: function() {
            switch(this.step.op) {
                case 'CALL':
                case 'CALLCODE':
                case 'DELEGATECALL':
                case 'STATICCALL': {
                    return `Contract call:`;
                }
                case 'CREATE':
                case 'CREATE2': {
                    return `Contract created:`;
                }
                default: {
                    return `Opcode not handled yet.`;
                }
            }
        }
    }

};
</script>
