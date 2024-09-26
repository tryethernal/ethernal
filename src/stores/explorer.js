import { defineStore } from 'pinia';

export const useExplorerStore = defineStore('explorer', {
    state: () => ({
        id: null,
        name: null,
        rpcServer: null
    }),

    actions: {
        updateExplorer(explorer) {
            if (explorer)
                this.$patch(explorer);
            else
                this.$reset();
        }
    }
});
