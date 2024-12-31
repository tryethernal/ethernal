<template>
    <v-dialog v-model="dialog" max-width="350">
        <v-card border flat>
            <v-card-title class="d-flex justify-space-between">
                Transaction Settings
                <v-btn color="grey" variant="text" icon="mdi-close" @click="close()" size="small"></v-btn>
            </v-card-title>
            <v-card-text>
                Slippage tolerance
                <div class="d-flex">
                    <v-chip-group mandatory selected-class="primary--text text--accent-4" v-model="slippageTolerance">
                        <v-chip size="small" :value="0.1">0.1%</v-chip>
                        <v-chip size="small" :value="0.5">0.5%</v-chip>
                        <v-chip size="small" :value="1">1%</v-chip>
                    </v-chip-group>
                    <v-text-field
                        max-width="80px"
                        density="compact"
                        rounded="xl"
                        class="ml-5"
                        reverse
                        hide-details="auto"
                        variant="outlined"
                        v-model="slippageTolerance">
                        <template v-slot:append-inner>
                            <span class="mr-2 text-grey">%</span>
                        </template>
                    </v-text-field>
                </div>
                <v-divider class="my-3"></v-divider>
                Transaction deadline
                <v-text-field
                    style="max-width: 140px;"
                    density="compact"
                    type="number"
                    class="rounded-xl mt-1"
                    reverse
                    hide-details="auto"
                    variant="outlined"
                    v-model="transactionTimeoutInMinutes">
                    <template v-slot:append-inner>
                        <span class="mr-2 text-grey">minutes</span>
                    </template>
                </v-text-field>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
<script>

export default {
    name: 'ExplorerDexParametersModal',
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        transactionTimeout: null,
        slippageToleranceInBps: null,
        options: null
    }),
    methods: {
        open(options) {
            this.dialog = true;
            this.options = options;
            this.transactionTimeout = options.transactionTimeout;
            this.slippageToleranceInBps = options.slippageToleranceInBps;
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        update() {
            this.$emit('parametersChanged', {
                transactionTimeout: this.transactionTimeout,
                slippageToleranceInBps: this.slippageToleranceInBps
            });
        },
        close() {
            this.resolve();
            this.options = null;
            this.dialog = false;
        }
    },
    computed: {
        slippageTolerance: {
            get() {
                if (!this.slippageToleranceInBps)
                    return '';
                return parseFloat(this.slippageToleranceInBps) / 100;
            },
            set(val) {
                this.slippageToleranceInBps = parseFloat(val) * 100;
                this.update();
            }
        },
        transactionTimeoutInMinutes: {
            get() {
                if (!this.transactionTimeout)
                    return 0;
                return Math.floor(this.transactionTimeout / 60);
            },
            set(val) {
                this.transactionTimeout = val * 60;
                this.update();
            }
        }
    }
}
</script>
<style scoped>
.v-text-field__slot input {
    text-align: right;
}
</style>
