<template>
    <v-container fluid>
        <v-card>
            <v-card-text>
                <Transactions-List></Transactions-List>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script>
import TransactionsList from './TransactionsList';

export default {
    name: 'Transactions',
    components: {
        TransactionsList
    }
}
</script>
