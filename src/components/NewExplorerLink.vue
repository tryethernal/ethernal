<template>
    <div>
        <v-row>
            <v-col cols="4" :class="{ 'pb-1': index == 0, 'py-0': index > 0 }">
                <v-text-field
                    v-model="link.url"
                    :rules="[v => !!v] || 'URL is required'"
                    small
                    outlined
                    dense
                    label="URL *">
                </v-text-field>
            </v-col>
            <v-col cols="4" :class="{ 'pb-1': index == 0, 'py-0': index > 0 }">
                <v-text-field
                    v-model="link.name"
                    :rules="[v => !!v] || 'Name is required'"
                    small
                    outlined
                    dense
                    label="Name *">
                </v-text-field>
            </v-col>
            <v-col cols="4" :class="{ 'pb-1': index == 0, 'py-0': index > 0 }">
                <v-autocomplete small outlined dense :append-icon="link.icon ? `${link.icon}` : ''"
                    label="Icon"
                    v-model="link.icon"
                    :items="icons"
                    :loading="loading"
                    :search-input.sync="queryIcon"
                    item-text="name"
                    :item-value="getItemValue"
                    auto-select-first
                    persistent-hint
                    hide-no-data
                    no-filter>
                    <template v-slot:item="data">
                        {{ data.item.name }}
                    </template>
                    <template v-slot:append-outer>
                        <v-btn icon small  @click="remove()">
                            <v-icon color="error">mdi-delete</v-icon>
                        </v-btn>
                    </template>
                </v-autocomplete>
            </v-col>
        </v-row>
    </div>
</template>
<script>
export default {
    name: 'NewExplorerLink',
    props: ['name', 'url', 'icon', 'index', 'uid'],
    data: () => ({
        link: { url: null, name: null, icon: null, uid: null },
        icons: [],
        queryIcon: null,
        loading: false
    }),
    mounted() {
        this.link = {
            url: this.url,
            name: this.name,
            icon: this.icon,
            uid: this.uid
        };
        if (this.icon)
            this.icons.push({ name: this.icon.split('mdi-')[1] });
    },
    methods: {
        remove() {
            this.$emit('removed', this.uid);
        },
        getItemValue: data => `mdi-${data.name}`,
    },
    watch: {
        'link.url': function() { this.$emit('updated', { link: this.link, index: this.index }) },
        'link.name': function() { this.$emit('updated', { link: this.link, index: this.index }) },
        'link.icon': function() { this.$emit('updated', { link: this.link, index: this.index }) },
        queryIcon(query) {
            if (!query) return;

            this.loading = true;
            this.server.searchIcon(query)
                .then(({ data }) => this.icons = data)
                .catch(console.log)
                .finally(() => this.loading = false);
        }
    }
}
</script>
