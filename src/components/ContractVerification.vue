<template>
    <v-card class="mb-6">
        <v-card-title>Contract Verification</v-card-title>
        <v-card-text>
            <v-alert class="mb-2" v-if="verificationErrorMessage" text density="compact" type="error">{{ verificationErrorMessage }}</v-alert>
            <v-form ref="form" v-model="canSubmit">
                <h4>Compiler Settings</h4>
                <v-card class="mb-2">
                    <v-card-text>
                        <v-row>
                            <v-col cols="4">
                                <v-select
                                    variant="outlined"
                                    density="compact"
                                    label="Compiler Version *"
                                    v-model="parameters.compiler"
                                    :items="includeNightlyBuilds ? allCompilerVersions : releasesCompilerVersions"
                                    hide-details
                                    return-object>
                                </v-select>
                            </v-col>

                            <v-col cols="3">
                                <v-checkbox
                                    label="Show nightly builds"
                                    v-model="includeNightlyBuilds"
                                    hide-details>
                                </v-checkbox>
                            </v-col>
                        </v-row>
                        <v-row>
                            <v-col cols="4">
                                <v-select
                                    variant="outlined"
                                    density="compact"
                                    label="EVM Version *"
                                    v-model="parameters.evmVersion"
                                    :items="evmVersions"
                                    item-title="text"
                                    item-value="value"
                                    hide-details>
                                </v-select>
                            </v-col>
                        </v-row>
                        <v-row>
                            <v-col cols="2">
                                <v-select
                                    variant="outlined"
                                    density="compact"
                                    label="Optimization *"
                                    v-model="parameters.optimizer"
                                    :items="[{ text: 'Yes', value: true }, { text: 'No', value: false }]"
                                    item-title="text"
                                    item-value="value"
                                    hide-details>
                                </v-select>
                            </v-col>
                            <v-col cols="2">
                                <v-text-field
                                    v-show="parameters.optimizer"
                                    v-model.number="parameters.runs"
                                    small
                                    variant="outlined"
                                    density="compact"
                                    hide-details
                                    label="Runs *"
                                    type="number">
                                </v-text-field>
                            </v-col>
                        </v-row>
                        <v-row class="mt-0">
                            <v-col cols="2">
                                <v-checkbox
                                    label="Via IR"
                                    v-model="parameters.viaIR"
                                    hide-details>
                                </v-checkbox>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <h4>Contract</h4>
                <v-card class="mb-2">
                    <v-card-text>
                        <v-row>
                            <v-col cols="4" class="pb-0">
                                <v-text-field
                                    :rules="[v => !!v || 'Contract name is required']"
                                    v-model="parameters.name"
                                    small
                                    variant="outlined"
                                    density="compact"
                                    label="Contract Name *">
                                </v-text-field>
                            </v-col>
                        </v-row>

                        <v-row>
                            <v-col cols="6" class="pt-0">
                                <v-file-input
                                    v-model="files"
                                    :rules="[v => !!v || 'At least one file is required.', v => v && v.length > 0 || 'At least one file is required.']"
                                    :hint="'To add multiple files, select them all at once.'"
                                    persistent-hint
                                    accept=".sol"
                                    small-chips
                                    multiple
                                    variant="outlined"
                                    show-size
                                    counter
                                    label="Contract Files *"
                                    prepend-inner-icon="mdi-paperclip"
                                    prepend-icon=""
                                    @update:modelValue="onFilesUploaded">
                                </v-file-input>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <h4>Libraries Linking</h4>
                <v-card class="mb-2">
                    <v-card-text>
                        <v-row v-for="(library, index) in rawLibraries" :key="index" align="center">
                            <v-col cols="3" :class="{ 'pb-1': index == 0, 'py-0': index > 0 }">
                                <v-text-field
                                    v-model="rawLibraries[index].name"
                                    :rules="[v => !!v] || 'Library name is required'"
                                    small
                                    variant="outlined"
                                    density="compact"
                                    persistent-hint
                                    hint="Format: MyFile.sol:LibraryName"
                                    label="Library Name *">
                                </v-text-field>
                            </v-col>
                            <v-col cols="4" :class="{ 'pb-1': index == 0, 'py-0': index > 0 }">
                                <v-text-field
                                    v-model="rawLibraries[index].address"
                                    :rules="[v => !!v && v.length == 42 || 'Invalid address (must be 42 characters long)']"
                                    small
                                    variant="outlined"
                                    density="compact"
                                    label="Library Address *">
                                        <template v-slot:append-outer>
                                            <v-btn icon size="small"  @click="removeLibrary(index)">
                                                <v-icon color="error">mdi-delete</v-icon>
                                            </v-btn>
                                        </template>
                                </v-text-field>
                            </v-col>
                        </v-row>
                        <v-row>
                            <v-col cols="2">
                                <v-btn class="bg-primary" @click="addLibrary()" variant="flat">Add Library</v-btn>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <h4>Constructor Arguments</h4>
                <v-card class="mb-2">
                    <v-card-text>
                        <v-textarea
                            rows="3"
                            primary
                            hide-details
                            variant="outlined"
                            density="compact"
                            v-model="parameters.constructorArguments"
                            label="Constructor Arguments (ABI Encoded)">
                        </v-textarea>
                    </v-card-text>
                </v-card>
            </v-form>
            <v-btn class="bg-primary" :disabled="!canSubmit" :loading="loading" variant="flat" @click="submit()">Verify</v-btn>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, reactive, onMounted , inject } from 'vue';
import { sanitize } from '../lib/utils';
import { useExplorerStore } from '../stores/explorer';
import { storeToRefs } from 'pinia';

const props = defineProps(['address']);
const emit = defineEmits(['contractVerified']);
const $server = inject('$server');

const form = ref(null);
const files = ref([]);
const includeNightlyBuilds = ref(false);
const rawLibraries = ref([]);
const verificationSuccess = ref(false);
const verificationErrorMessage = ref(null);
const canSubmit = ref(false);
const loading = ref(false);

const allCompilerVersions = ref([]);
const releasesCompilerVersions = ref([]);

const parameters = reactive({
    viaIR: false,
    sources: {},
    imports: {},
    libraries: {},
    name: null,
    compiler: null,
    address: null,
    slug: null,
    optimizer: false,
    runs: null,
    evmVersion: null,
    constructorArguments: null
});

const evmVersions = [
    { value: null, text: 'default (compiler default)' },
    { value: 'cancun', text: 'cancun (latest version)' },
    { value: 'shanghai', text: 'shanghai' },
    { value: 'paris', text: 'paris' },
    { value: 'london', text: 'london' },
    { value: 'berlin', text: 'berlin' },
    { value: 'istanbul', text: 'istanbul' },
    { value: 'petersburg', text: 'petersburg' },
    { value: 'constantinople', text: 'constantinople' },
    { value: 'byzantium', text: 'byzantium' },
    { value: 'spuriousDragon', text: 'spuriousDragon' },
    { value: 'tangerineWhistle', text: 'tangerineWhistle' },
    { value: 'homestead', text: 'homestead (oldest version)' },
];

const explorerStore = useExplorerStore();
const { slug } = storeToRefs(explorerStore);

onMounted(async () => {
    parameters.address = props.address;
    parameters.slug = slug.value;
    
    try {
        const { data } = await $server.getCompilerVersions();
        data.builds.forEach(build => {
            const version = `v${build.longVersion}`;
            allCompilerVersions.value.unshift(version);
            if (!build.prerelease) {
                releasesCompilerVersions.value.unshift(version);
            }
        });
        parameters.compiler = releasesCompilerVersions.value[0];
    } catch (error) {
        console.error('Failed to fetch compiler versions:', error);
    }
});

const addLibrary = () => {
    rawLibraries.value.push({ name: null, address: null });
};

const removeLibrary = (index) => {
    rawLibraries.value.splice(index, 1);
};

const onFileLoaded = (name) => {
    return (event) => {
        parameters.sources[name] = { content: event.target.result };
    };
};

const onFilesUploaded = (newFiles) => {
    parameters.sources = {};
    if (!newFiles) return;
    
    newFiles.forEach(file => {
        const fileReader = new FileReader();
        fileReader.onload = onFileLoaded(file.name);
        fileReader.readAsText(file);
    });
};

const submit = async () => {
    loading.value = true;
    verificationSuccess.value = false;
    verificationErrorMessage.value = null;

    try {
        const libraries = {};
        rawLibraries.value.forEach(l => {
            if (l.name && l.name.split(':').length == 2 && l.address) {
                const [fileName, libName] = l.name.split(':');
                libraries[fileName] = {
                    [libName]: l.address
                };
            }
        });

        const data = sanitize({
            explorerSlug: parameters.slug,
            compilerVersion: parameters.compiler,
            code: {
                sources: parameters.sources,
                imports: parameters.imports,
                libraries: libraries
            },
            contractName: parameters.name,
            constructorArguments: parameters.constructorArguments,
            evmVersion: parameters.evmVersion,
            optimizer: parameters.optimizer,
            runs: parameters.runs,
            viaIR: parameters.viaIR
        });

        const { data: responseData } = await $server.verifyContract(props.address, data);
        verificationSuccess.value = true;
        emit('contractVerified', responseData);
    } catch (error) {
        verificationErrorMessage.value = `Verification failed. ${error.response?.data || error.message}`;
    } finally {
        loading.value = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};
</script>
