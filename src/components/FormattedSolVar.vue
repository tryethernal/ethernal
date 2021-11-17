<template>
    <div>
        <span>{{ inputLabel }}</span>
        <span v-if="input.type == 'address'">
            <Hash-Link :type="'address'" :hash="value" :withName="true" />
        </span>
        <span v-else>
            {{ formatResponse(value, commified) }}
            <v-icon @click="commified = !commified" small>mdi-swap-horizontal</v-icon>
        </span>
    </div>
</template>
<script>
import { formatResponse } from '@/lib/utils';
import HashLink from './HashLink';

export default {
    name: 'FormattedSolVar',
    props: ['input', 'value'],
    components: {
        HashLink
    },
    data: () => ({
        commified: true
    }),
    methods: {
        formatResponse: formatResponse
    },
    computed: {
        inputLabel: function() {
            if (this.input.name)
                return `\t${this.input.type} ${this.input.name}: `;
            else
                return `\t${this.input.type}: `;
        }
    }
}
</script>
