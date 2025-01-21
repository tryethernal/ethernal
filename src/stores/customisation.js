import createWorkerBox from 'workerboxjs';
import { defineStore } from 'pinia';

export const useCustomisationStore = defineStore('customisation', {
    state: () => ({
        packages: {},
        functions: {},
        worker: null
    }),
    actions: {
        async updateCustomisations(customisations) {
            for (const [alias, name] of Object.entries(customisations.packages)) {
                this.packages[alias] = await import(`https://cdn.skypack.dev/${name}?min`);
            }
            for (const [alias, fn] of Object.entries(customisations.functions)) {
                this.functions[alias] = fn;
            }
            this.worker = await createWorkerBox();
        },
        alternateLink(address) {
            if (!this.functions.alternateLink || !this.worker) return new Promise(resolve => resolve(null));

            return this.worker.run(this.functions.alternateLink,
                {
                    address,
                    swisstronikUtils: this.packages.swisstronikUtils
                }
            );
        }
    }
});

