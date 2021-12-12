<template>
    <v-container fluid>
        <v-data-table
            :loading="loading"
            :items="tokens"
            :headers="headers"
            sort-by="timestamp"
            :sort-desc="true">
            <template v-slot:item.address="{ item }">
                <Hash-Link :type="'address'" :hash="item.address" />
            </template>
            <template v-slot:item.contractName="{ item }">
                {{ item.name }}
            </template>
            <template v-slot:item.tokenName="{ item }">
                {{ item.token.name }}
            </template>
            <template v-slot:item.tokenSymbol="{ item }">
                {{ item.token.symbol }}
            </template>
            <template v-slot:item.timestamp="{ item }">
                <span v-if="item.timestamp">{{ parseInt(item.timestamp) | moment('YYYY-MM-DD h:mm:ss A') }}</span>
            </template>
            <template v-slot:item.tags="{ item }">
                <v-chip v-for="(pattern, idx) in item.patterns" :key="idx" x-small class="success mr-2">
                    {{ formatContractPattern(pattern) }}
                </v-chip>
            </template>
        </v-data-table>
    </v-container>
</template>
<script>
import HashLink from '@/components/HashLink';
import { formatContractPattern } from '@/lib/utils';

export default {
    name: 'Contracts',
    components: {
        HashLink
    },
    data: () => ({
        loading: true,
        tokens: [],
        headers: [
            {
                text: 'Address',
                value: 'address'
            },
            {
                text: 'Contract Name',
                value: 'contractName'
            },
            {
                text: 'Token Name',
                value: 'tokenName'
            },
            {
                text: 'Token Symbol',
                value: 'tokenSymbol'
            },
            {
                text: 'Deployed On',
                value: 'timestamp'
            },
            {
                text: '',
                value: 'tags'
            }
        ]
    }),
    mounted: function() {
        this.$bind('tokens', this.db.tokens()).then(() => this.loading = false);
    },
    methods: {
        formatContractPattern
    }
}
</script>
