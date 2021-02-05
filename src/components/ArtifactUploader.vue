<template>
    <v-card outlined class="mb-4">
        <v-card-subtitle v-if="!contract.artifact">Upload a Truffle artifact to read contract storage and interact with it.</v-card-subtitle>
        <v-card-subtitle v-else>Artifact for contract "<b>{{ contract.artifact.contractName }}</b>" has been uploaded.</v-card-subtitle>
        <v-card-text v-if="!contract.artifact || Object.keys(contract.dependencies).length">
            <input  v-if="!contract.artifact" type="file" ref="contractArtifact" v-on:change="contractArtifactUploaded()"/>

            <div v-if="Object.keys(contract.dependencies).length" class="mb-1">
                <h5>This contract has dependencies:</h5>
            </div>
        
            <div v-for="(dep, key, idx) in contract.dependencies" :key="idx" class="mb-2">
                <div v-if="!dep.artifact">
                    Upload artifact for contract <b>{{ dep.name }}</b>: <input type="file" :ref="`dependencyArtifact-${key}`" v-on:change="dependencyArtifactUploaded(key)"/>
                </div>
                <div v-else>
                    Artifact for contract <b>{{ dep.name }}</b> has been uploaded.
                </div>
            </div>
        </v-card-text>
    </v-card>
</template>
<script>

export default {
    name: 'ArtifactUploader',
    props: ['contract'],
    data: () => ({
    }),
    methods: {
        contractArtifactUploaded: function() {
            var fileReader = new FileReader();
            fileReader.onload = () => {
                var artifact = fileReader.result;
                var parsedArtifact = JSON.parse(artifact);
                var dependencies = {}

                Object.entries(parsedArtifact.ast.exportedSymbols)
                    .forEach(symbol => {
                        if (symbol[0] != parsedArtifact.contractName) {
                            dependencies[symbol[1][0]] = {
                                name: symbol[0],
                                artifact: null
                            }
                        }
                    });

                this.db.collection('contracts')
                    .doc(this.contract.address)
                    .update({
                        name: parsedArtifact.contractName,
                        artifact: artifact,
                        dependencies: dependencies
                    })
                    .then(this.decodeContract);
            };
            fileReader.readAsText(this.$refs.contractArtifact.files[0]);
        },
        dependencyArtifactUploaded: function(dependencyId) {
            var fileReader = new FileReader();
            fileReader.onload = () => {
                var artifact = fileReader.result;
                var updateHash = {};
                
                updateHash[`dependencies.${dependencyId}.artifact`] = artifact;
                this.db.collection('contracts')
                    .doc(this.hash)
                    .update(updateHash)
                    .then(this.decodeContract);
            };
            fileReader.readAsText(this.$refs[`dependencyArtifact-${dependencyId}`][0].files[0]);
        },
        updateStorageStructure: function() {
            return new Promise((resolve) => {
                this.instanceDecoder.variables().then((res) => {
                    var storageStructure = {};
                    res.forEach(function(variable) {
                        storageStructure[variable.name] = this.buildVariableStruct(variable);
                    }, this);
                    this.db.collection('contracts').doc(this.hash).update({ storageStructure: JSON.stringify(storageStructure) }).then(resolve);
                }); 
            })
        },
        dependenciesNeded: function() {
            for (const key in this.contract.dependencies) {
               if (this.contract.dependencies[key].artifact === null)
                    return true;
            }
            return false;
        }
    }
}
</script>