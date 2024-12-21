<template>
    <div>
        <v-row>
            <v-col cols="4" :class="{ 'pb-1': index == 0, 'py-0': index > 0 }">
                <v-text-field
                    v-model="link.url"
                    :rules="[v => !!v] || 'URL is required'"
                    small
                    variant="outlined"
                    density="compact"
                    label="URL *">
                </v-text-field>
            </v-col>
            <v-col cols="4" :class="{ 'pb-1': index == 0, 'py-0': index > 0 }">
                <v-text-field
                    v-model="link.name"
                    :rules="[v => !!v] || 'Name is required'"
                    small
                    variant="outlined"
                    density="compact"
                    label="Name *">
                </v-text-field>
            </v-col>
            <v-col cols="4" :class="{ 'pb-1': index == 0, 'py-0': index > 0 }">
                <v-autocomplete small variant="outlined" density="compact" :append-icon="link.icon ? `${link.icon}` : ''"
                    label="Icon"
                    v-model="link.icon"
                    :items="icons"
                    :loading="loading"
                    :search.sync="queryIcon"
                    @update:search="search"
                    item-title="name"
                    :item-value="getItemValue"
                    auto-select-first
                    persistent-hint
                    hide-no-data
                    no-filter>
                    <template v-slot:item="{ item }">
                        {{ item.raw.name }}
                    </template>
                    <template v-slot:append-outer>
                        <v-btn icon size="small"  @click="remove()">
                            <v-icon color="error">mdi-delete</v-icon>
                        </v-btn>
                    </template>
                </v-autocomplete>
            </v-col>
        </v-row>
    </div>
</template>
<script>
import { ref, watch } from 'vue';

export default {
    name: 'NewExplorerLink',
    props: ['name', 'url', 'icon', 'index', 'uid'],
    data: () => ({
        link: { url: null, name: null, icon: null, uid: null },
        icons: [],
        loading: false,
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
    setup() {
        const queryIcon = ref(null);
        console.log('ok')
        watch(queryIcon, (newValue) => {
            this.search(newValue)
        });

        return { queryIcon };
    },
    methods: {
        remove() {
            this.$emit('removed', this.uid);
        },
        getItemValue: data => `mdi-${data.name}`,
        search(query) {
            if (!query) return this.icons = [];

            this.loading = true;
            this.$server.searchIcon(query)
                .then(({ data }) => this.icons = data)
                .catch(console.error)
                .finally(() => this.loading = false);
        }
    },
    watch: {
        'link.url'() {
            this.$emit('updated', { link: this.link, index: this.index });
        },
        'link.name'() {
            this.$emit('updated', { link: this.link, index: this.index })
        },
        'link.icon'() {
            this.$emit('updated', { link: this.link, index: this.index })
        },
    }
}
</script>
