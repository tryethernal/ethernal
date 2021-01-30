<template>
    <v-container fluid>
        <v-data-table
            loading="true"
            :items="blocks"
            :sort-by="'number'"
            :sort-desc="true"
            :headers="headers">
            <template v-slot:item.number="{ item }">
                <router-link :to="'/block/' + item.number">{{item.number}}</router-link>
            </template>
            <template v-slot:item.timestamp="{ item }">
                {{ item.timestamp | moment('YYYY-MM-DD hh:mm:ss') }}
            </template>
            <template v-slot:item.gasUsed="{ item }">
                {{ item.gasUsed.toLocaleString()  }}
            </template>
            <template v-slot:item.transactionNumber="{ item }">
                {{ item.transactions.length  }} {{ item.transactions.length != 1 ? 'transactions' : 'transaction' }}
            </template>
        </v-data-table>
    </v-container>
</template>

<script>
export default {
    name: 'Blocks',
    data: () => ({
        blocks: [],
        headers: [
            {
                text: 'Block',
                value: 'number'
            },
            {
                text: 'Mined On',
                value: 'timestamp'
            },
            {
                text: 'Gas Used',
                value: 'gasUsed'
            },
            {
                text: 'Transaction Count',
                value: 'transactionNumber'
            }
        ]
    }),
    mounted: function() {
        this.$bind('blocks', this.db.collection('blocks'), { 
            serialize: snapshot => {
                if (snapshot.data().transactions === undefined)
                    return Object.defineProperty(snapshot.data(), 'transactions', { value: [] })
                else
                    return snapshot.data();
            }
        });
    }
}
</script>
