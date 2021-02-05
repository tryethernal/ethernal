<template>
    <div>
        <Add-Tracked-Key-Modal ref="addTrackedKeyModal" />
        {{storage.label}}
        <v-btn @click.stop="openAddTrackedKeyModal(storage.index)" color="primary" icon outlined x-small v-if="storage.children != null">
            <v-icon>mdi-plus</v-icon>
        </v-btn>
        <Storage-Structure v-bind:storage="child" v-for="(child, idx) in storage.children" :key="idx" class="ml-4" @addStorageStructureChild="addStorageStructureChild" />
    </div>
</template>
<script>
import AddTrackedKeyModal from './AddTrackedKeyModal';

export default {
    name: 'StorageStructure',
    props: ['storage'],
    components: {
        AddTrackedKeyModal
    },
    methods: {
        openAddTrackedKeyModal: function(structIndex) {
            this.$refs.addTrackedKeyModal
                .open({ variableIndex: structIndex })
                .then(res => {
                    if (res) {
                        this.addStorageStructureChild(this.storage, res.variableIndex, res.key);
                    }
                });
        },
        addStorageStructureChild: function(storage, idx, key) {
            this.$emit('addStorageStructureChild', storage, idx, key);
        }
    }
};
</script>
