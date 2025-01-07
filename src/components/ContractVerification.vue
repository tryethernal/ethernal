<template>
    <v-card class="mb-6">
        <v-card-title>Contract Verification</v-card-title>
        <v-card-text>
            <v-alert v-if="verificationErrorMessage" text type="error">{{ verificationErrorMessage }}</v-alert>
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
                                    @change="onFilesUploaded">
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

<script>
import { sanitize } from '../lib/utils';
import { mapStores } from 'pinia';
import { useExplorerStore } from '../stores/explorer';

export default {
    name: 'ContractVerification',
    props: ['address'],
    components: {
    },
    data: () => ({
        files: [],
        includeNightlyBuilds: false,
        rawLibraries: [],
        verificationSuccess: false,
        verificationErrorMessage: null,
        parameters: {
            viaIr: false,
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
        },
        allCompilerVersions: [],
        releasesCompilerVersions: [],
        evmVersions: [
            { value: null, text: 'default (compiler default)' },
            { value: 'shanghai', text: 'shanghai (latest version)' },
            { value: 'paris', text: 'paris' },
            { value: 'london', text: 'london' },
            { value: 'berlin', text: 'berlin' },
            { value: 'istanbul', text: 'instanbul' },
            { value: 'petersburg', text: 'petersburg' },
            { value: 'constantinople', text: 'constantinople' },
            { value: 'byzantium', text: 'byzantium' },
            { value: 'spuriousDragon', text: 'spuriousDragon' },
            { value: 'tangerineWhistle', text: 'tangerineWhistle' },
            { value: 'homestead', text: 'homestead (oldest version)' },
        ],
        canSubmit: false,
        loading: false
    }),
    setup(props, { emit }) {
        const emitContractVerified = () => emit('contractVerified');

        return { emitContractVerified };
    },
    mounted() {
        this.parameters.address = this.address;
        this.parameters.slug = this.explorerStore.slug;
        this.$server.getCompilerVersions()
            .then(({ data }) => {
                for (let i = 0; i < data.builds.length; i++) {
                    this.allCompilerVersions.unshift(`v${data.builds[i].longVersion}`);
                    if (!data.builds[i].prerelease)
                        this.releasesCompilerVersions.unshift(`v${data.builds[i].longVersion}`);
                    this.parameters.compiler = this.releasesCompilerVersions[0];
                }
            });
    },
    methods: {
        addLibrary() {
            this.rawLibraries.push({ name: null, address: null });
        },
        removeLibrary(index) {
            this.rawLibraries.splice(index, 1);
        },
        onFileLoaded(_this, name) {
            return function(data) {
                _this.parameters.sources[name] = { content: data.target.result };
            };
        },
        onFilesUploaded(files) {
            this.parameters.sources = {};
            files.forEach(file => {
                const fileReader = new FileReader();
                fileReader.onload = this.onFileLoaded(this, file.name);
                fileReader.readAsText(file);
            })
        },
        submit() {
            this.loading = true;
            this.verificationSuccess = false;
            this.verificationErrorMessage = null;

            const libraries = {};
            this.rawLibraries.forEach(l => {
                if (l.name && l.name.split(':').length == 2 && l.address)
                    libraries[l.name.split(':')[0]] = {
                        [l.name.split(':')[1]]: l.address
                    };
            });

            const data = sanitize({
                explorerSlug: this.parameters.slug,
                compilerVersion: this.parameters.compiler,
                code: {
                    sources: this.parameters.sources,
                    imports: this.parameters.imports,
                    libraries: libraries
                },
                contractName: this.parameters.name,
                constructorArguments: this.parameters.constructorArguments,
                evmVersion: this.parameters.evmVersion,
                optimizer: this.parameters.optimizer,
                runs: this.parameters.runs,
                viaIR: this.parameters.viaIR
            });

            this.$server.verifyContract(this.address, data)
                .then(() => {
                    this.verificationSuccess = true;
                    this.emitContractVerified();
                })
                .catch(({ response: { data }}) => this.verificationErrorMessage =`Verification failed. ${data}`)
                .finally(() => {
                    this.loading = false;
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
        }
    },
    computed: {
        ...mapStores(useExplorerStore)
    }
}
</script>
