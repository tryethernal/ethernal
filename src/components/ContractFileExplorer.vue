<template>
    <div class="fill-height d-flex flex-column">
        <div class="px-2 mb-2">
            <v-text-field
                v-model="searchTerm"
                density="compact"
                hide-details
                placeholder="Search files..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                class="search-field"
                clearable
                clear-icon="mdi-close-circle-outline"
                @update:model-value="handleSearch"
            ></v-text-field>
        </div>
        <v-treeview
            v-model:opened="openNodes"
            :items="filteredFileTree"
            density="compact"
            item-value="id"
            activatable
            v-model:activated="selectedItems"
            class="bg-grey-lighten-4 flex-grow-1 treeview-container"
            open-on-click>
            <template v-slot:prepend="{ item, isOpen }">
                <v-icon color="primary" v-if="item.children" :icon="isOpen ? 'mdi-folder-open' : 'mdi-folder'"></v-icon>
                <v-icon color="primary" v-else icon="mdi-file-document-outline"></v-icon>
            </template>
        </v-treeview>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
    sources: {
        type: Array,
        required: true
    },
    selectedFile: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['select-file']);

const openNodes = ref([]);
const selectedItems = ref([]);
const searchTerm = ref('');

// Methods to expose to parent
const expandAll = () => {
    // Collect all possible folder paths
    const allPaths = [];
    const collectPaths = (items, parentPath = '') => {
        items.forEach(item => {
            if (item.children) {
                const currentPath = parentPath ? `${parentPath}/${item.title}` : item.title;
                allPaths.push(item.id);
                collectPaths(item.children, currentPath);
            }
        });
    };
    collectPaths(fileTree.value);
    openNodes.value = allPaths;
};

const collapseAll = () => {
    openNodes.value = [];
};

// Expose methods to parent
defineExpose({
    expandAll,
    collapseAll
});

// Watch selectedItems changes
watch(selectedItems, (items) => {
    if (!items.length) return;
    const item = items[0];
    if (!item.children) {
        // Find the file in sources to get its content
        const sourceFile = props.sources.find(s => s.fileName === item);
        if (sourceFile) {
            emit('select-file', [{
                id: sourceFile.fileName,
                title: sourceFile.fileName.split('/').pop(),
                content: sourceFile.content
            }]);
        }
    }
}, { deep: true });

// Watch for selectedFile changes
watch(() => props.selectedFile, (newFile) => {
    if (newFile) {
        const parts = newFile.split('/');
        parts.pop(); // Remove the file name
        let path = '';
        parts.forEach(part => {
            path = path ? path + '/' + part : part;
            if (!openNodes.value.includes(path)) {
                openNodes.value.push(path);
            }
        });
        // Update selected items
        if (!selectedItems.value.includes(newFile)) {
            selectedItems.value = [newFile];
        }
    }
}, { immediate: true });

// Convert flat file list to tree structure
const fileTree = computed(() => {
    const tree = [];

    // Helper function to ensure a path exists in the tree
    const ensurePath = (pathParts, currentLevel = tree, parentPath = '') => {
        if (pathParts.length === 0) return currentLevel;

        const currentPart = pathParts[0];
        const currentPath = parentPath ? `${parentPath}/${currentPart}` : currentPart;
        
        // Look for existing folder with same full path
        let node = currentLevel.find(n => n.id === currentPath && n.children);

        if (!node) {
            node = {
                id: currentPath,
                title: currentPart,
                children: []
            };
            currentLevel.push(node);
        }

        if (pathParts.length > 1) {
            return ensurePath(pathParts.slice(1), node.children, currentPath);
        }

        return node.children;
    };

    // Process each file
    props.sources.forEach(source => {
        const pathParts = source.fileName.split('/');
        const fileName = pathParts.pop();
        const parentPath = ensurePath(pathParts);

        parentPath.push({
            id: source.fileName,
            title: fileName,
            content: source.content
        });
    });

    // Sort function to put folders first, then files, both alphabetically
    const sortNodes = (nodes) => {
        nodes.sort((a, b) => {
            // If one is a folder and the other is a file, folder comes first
            if (a.children && !b.children) return -1;
            if (!a.children && b.children) return 1;
            // If both are folders or both are files, sort alphabetically
            return a.title.localeCompare(b.title);
        });

        // Recursively sort children
        nodes.forEach(node => {
            if (node.children) {
                sortNodes(node.children);
            }
        });
    };

    sortNodes(tree);
    return tree;
});

// Filter tree based on search term
const filteredFileTree = computed(() => {
    if (!searchTerm.value) return fileTree.value;
    
    const searchLower = searchTerm.value.toLowerCase();
    
    // Helper function to check if a node or its children match the search
    const nodeMatches = (node) => {
        // Check if current node matches
        if (node.title.toLowerCase().includes(searchLower)) {
            return true;
        }
        
        // If it's a folder, check children
        if (node.children) {
            return node.children.some(child => nodeMatches(child));
        }
        
        return false;
    };
    
    // Helper function to filter tree
    const filterTree = (nodes) => {
        return nodes.filter(node => {
            if (nodeMatches(node)) {
                // If it's a folder, recursively filter its children
                if (node.children) {
                    const filteredChildren = filterTree(node.children);
                    return {
                        ...node,
                        children: filteredChildren
                    };
                }
                return true;
            }
            return false;
        }).map(node => {
            if (node.children) {
                return {
                    ...node,
                    children: filterTree(node.children)
                };
            }
            return node;
        });
    };
    
    return filterTree(fileTree.value);
});

// Handle search input
const handleSearch = () => {
    // If search is not empty, expand all nodes to show matches
    if (searchTerm.value) {
        expandAll();
    }
};
</script>

<style scoped>
.v-treeview-node__root {
    min-height: 28px !important;
}

:deep(.v-treeview-node__root) {
    background-color: rgb(var(--v-theme-grey-lighten-4));
}

:deep(.v-treeview-node__level) {
    background-color: rgb(var(--v-theme-grey-lighten-4));
}

/* Ensure proper scrolling behavior */
.treeview-container {
    overflow-y: auto !important;
}

:deep(.v-treeview) {
    height: 100%;
    overflow: visible;
}

/* Search field styles */
.search-field {
    margin-top: 4px;
}

:deep(.search-field .v-field__input) {
    padding-top: 6px;
    padding-bottom: 6px;
    min-height: 36px;
}

:deep(.search-field .v-field__clearable) {
    opacity: 0.4;
    padding: 0;
}

:deep(.search-field .v-field__clearable:hover) {
    opacity: 0.7;
}

:deep(.search-field .v-icon--size-default) {
    font-size: 18px;
}
</style>
