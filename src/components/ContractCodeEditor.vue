<template>
    <div>
        <v-card height="600">
            <v-card-text class="pa-0 fill-height">
                <v-row no-gutters class="fill-height">
                    <v-col cols="9" class="d-flex flex-column">
                        <div v-if="selectedFiles.length > 0" class="text-subtitle-1 py-2 bg-grey-lighten-4">
                            <v-tabs v-model="activeTab" density="compact" show-arrows>
                                <v-tab 
                                    v-for="file in selectedFiles" 
                                    :key="file.id" 
                                    :value="file.id"
                                    class="pr-1"
                                >
                                    <span class="mr-2">{{ file.title }}</span>
                                    <v-btn
                                        size="x-small"
                                        icon
                                        variant="text"
                                        class="ml-1 mr-n2"
                                        @click.stop="closeTab(file.id)"
                                    >
                                        <v-icon size="small">mdi-close</v-icon>
                                    </v-btn>
                                </v-tab>
                            </v-tabs>
                        </div>
                        <div class="flex-grow-1 d-flex overflow-hidden">
                            <template v-if="selectedFiles.length > 0">
                                <v-ace-editor 
                                    :options="{ useWorker: false }" 
                                    showPrintMargin="false" 
                                    useWorker="false" 
                                    readonly 
                                    :value="selectedFileContent" 
                                    lang="solidity" 
                                    theme="chrome" 
                                    class="flex-grow-1 editor-container"
                                ></v-ace-editor>
                            </template>
                            <div v-else class="d-flex align-center justify-center flex-grow-1">
                                <div class="text-medium-emphasis">
                                    <v-icon size="large" class="mb-2">mdi-file-document-outline</v-icon>
                                    <div>Select a file to view its content</div>
                                </div>
                            </div>
                        </div>
                    </v-col>
                    <v-col cols="3" class="border-l bg-grey-lighten-4 d-flex flex-column overflow-hidden">
                        <div class="pa-2 flex-grow-1 d-flex flex-column">
                            <div class="d-flex align-center justify-space-between mb-2">
                                <div class="text-subtitle-2">File Explorer</div>
                                <v-btn
                                    size="x-small"
                                    variant="text"
                                    @click="isExpanded ? collapseAll() : expandAll()"
                                >
                                    {{ isExpanded ? 'Collapse All' : 'Expand All' }}
                                </v-btn>
                            </div>
                            <v-divider class="mb-2"></v-divider>
                            <div class="flex-grow-1 file-explorer-container">
                                <ContractFileExplorer 
                                    ref="fileExplorer"
                                    :sources="sources"
                                    :selected-file="selectedFile"
                                    @select-file="handleFileSelect"
                                />
                            </div>
                        </div>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import ace from 'ace-builds';
import themeChromeUrl from 'ace-builds/src-noconflict/theme-chrome?url';
import langSolidityUrl from 'ace-mode-solidity/build/remix-ide/mode-solidity.js?url';
import { VAceEditor } from 'vue3-ace-editor';
import ContractFileExplorer from './ContractFileExplorer.vue';

// Configure ace editor
ace.config.setModuleUrl('ace/theme/chrome', themeChromeUrl);
ace.config.setModuleUrl('ace/mode/solidity', langSolidityUrl);

// Props
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

// Reactive state
const selectedFiles = ref([]);
const activeTab = ref(0);
const isExpanded = ref(false);

// Add ref for the file explorer
const fileExplorer = ref(null);

// Find and open first file on mount
const openFirstFile = () => {
    if (props.sources.length === 0 || selectedFiles.value.length > 0) return;
    
    // Find files at the root level (no '/' in the path)
    const rootFiles = props.sources
        .filter(source => !source.fileName.includes('/'))
        .sort((a, b) => a.fileName.localeCompare(b.fileName));
    
    // If there are root files, open the first one
    const firstFile = rootFiles[0];
    if (firstFile) {
        selectedFiles.value = [{
            id: firstFile.fileName,
            title: firstFile.fileName,
            content: firstFile.content
        }];
        activeTab.value = firstFile.fileName;
    }
};

// Watch for sources changes and open first file
watch(() => props.sources, () => {
    openFirstFile();
}, { immediate: true });

// Watch for selectedFile changes from parent
watch(() => props.selectedFile, (newFile) => {
    if (newFile && !selectedFiles.value.some(f => f.id === newFile)) {
        const file = props.sources.find(s => s.fileName === newFile);
        if (file) {
            selectedFiles.value = [{
                id: file.fileName,
                title: file.fileName.split('/').pop()
            }];
            activeTab.value = file.fileName;
        }
    }
}, { immediate: true });

// Computed properties
const selectedFileContent = computed(() => {
    if (selectedFiles.value.length === 0) return '';
    
    // Find the selected file by its ID (activeTab contains the file ID)
    const selectedFile = selectedFiles.value.find(f => f.id === activeTab.value);
    if (!selectedFile) return '';
    
    // First try to get content from the selectedFiles array
    if (selectedFile.content) {
        return selectedFile.content;
    }
    
    // Fallback to sources array if content is not in selectedFiles
    const file = props.sources.find(s => s.fileName === selectedFile.id);
    return file ? file.content : '';
});

// Methods to expand/collapse all
const expandAll = () => {
    fileExplorer.value?.expandAll();
    isExpanded.value = true;
};

const collapseAll = () => {
    fileExplorer.value?.collapseAll();
    isExpanded.value = false;
};

// Methods
const handleFileSelect = (files) => {
    if (!files || !files.length) return;
    const newFile = files[0]; // We get one file at a time from the explorer

    // Check if the file is already open
    const existingIndex = selectedFiles.value.findIndex(f => f.id === newFile.id);
    
    if (existingIndex >= 0) {
        // If file is already open, just switch to its tab
        activeTab.value = newFile.id;
    } else {
        // Add new file and switch to its tab
        selectedFiles.value.push(newFile);
        activeTab.value = newFile.id;
    }
};

// Add method to close tabs
const closeTab = (fileId) => {
    const index = selectedFiles.value.findIndex(f => f.id === fileId);
    if (index === -1) return;

    // If we're closing the active tab, switch to the next one or previous one
    if (fileId === activeTab.value) {
        if (index < selectedFiles.value.length - 1) {
            // Switch to next tab
            activeTab.value = selectedFiles.value[index + 1].id;
        } else if (index > 0) {
            // Switch to previous tab
            activeTab.value = selectedFiles.value[index - 1].id;
        }
    }

    // Remove the tab
    selectedFiles.value.splice(index, 1);

    // If no tabs left, reset activeTab
    if (selectedFiles.value.length === 0) {
        activeTab.value = 0;
    }
};
</script>

<style scoped>
.editor {
    border: 1px solid var(--v-background-base);
    border-radius: 5px;
}
.underlined {
    text-decoration: underline;
}

/* Override Vuetify's default text transformation for tabs */
:deep(.v-tab) {
    text-transform: none;
}

.border-l {
    border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

:deep(.v-tabs) {
    background-color: rgb(var(--v-theme-grey-lighten-4));
}

/* Editor container styles */
.editor-container {
    height: 100%;
    overflow: auto;
}

:deep(.ace_editor) {
    height: 100% !important;
}

/* File explorer container styles */
.file-explorer-container {
    position: relative;
    height: 100%;
    overflow: hidden;
}

:deep(.file-explorer-container > div) {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
}
</style>
