<template>
    <v-container fluid>
        <v-data-table
            :loading="loading"
            :items="explorers"
            :server-items-length="explorers.length"
            :footer-props="{
                itemsPerPageOptions: [10, 25, 100]
            }"
            :headers="headers">
            <template v-slot:item.name="{ item }">
                <router-link :to="`/explorers/${item.id}`">{{ item.name }}</router-link>
            </template>
            <template v-slot:item.domain="{ item }">
                <a :href="`https://${ item.domain }`" target="_blank">https://{{ item.domain }}</a>
            </template>
        </v-data-table>
    </v-container>
</template>

<script>
export default {
    name: 'Explorers',
    data: () => ({
        explorers: [],
        headers: [],
        loading: true,
    }),
    mounted() {
        this.headers.push(
            { text: 'Name', value: 'name' },
            { text: 'Domain', value: 'domain', sortable: false },
            { text: 'RPC', value: 'rpcServer', sortable: false }
        );
        this.server.getExplorers()
            .then(({ data }) => this.explorers = data)
            .catch(console.log)
            .finally(this.loading = false);
    },
}
</script>
