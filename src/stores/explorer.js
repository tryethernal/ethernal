import * as Sentry from "@sentry/vue";
import { defineStore } from 'pinia';

export const useExplorerStore = defineStore('explorer', {
    state: () => ({
        id: null
    }),

    actions: {
        updateExplorer(explorer) {
            for (const [key, value] of Object.entries(explorer))
                this[key] = value;
        }
    }
});