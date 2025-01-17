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
                <v-autocomplete small variant="outlined" density="compact"
                    label="Icon"
                    v-model="link.icon"
                    :items="icons"
                    :loading="loading"
                    @update:search="search"
                    item-title="name"
                    :item-value="getItemValue"
                    auto-select-first
                    persistent-hint
                    hide-no-data
                    no-filter>
                    <template v-slot:selection="{ props, item }">
                        <v-icon class="mr-2 my-1" :icon="`mdi-${item.raw.name || item.raw.split('mdi-')[1]}`"></v-icon>{{ iconName }}
                    </template>
                    <template v-slot:item="{ props, item }">
                        <v-list-item v-bind="props"
                            :prepend-icon="`mdi-${item.raw.name || item.raw.split('mdi-')[1]}`"
                            :title="item.raw.name"></v-list-item>
                    </template>
                    <template v-slot:append>
                        <v-btn density="compact" variant="text" icon="mdi-delete" size="small" color="error" @click="remove()"></v-btn>
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
    computed: {
        iconName() {
            const name = this.link.icon.split('mdi-')[1];
            if (name.length > 4)
                return name.slice(0, 4) + '...';
            return name;
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
        }
    }
}
</script>
