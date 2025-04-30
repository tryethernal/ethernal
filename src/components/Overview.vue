<template>
    <div class="overview">
        <div class="search-hero">
            <div class="search-container">
                <h1 class="text-h5 text-center mb-4">{{ explorerStore.name || 'Ethernal' }} Explorer</h1>
                <SearchBar />
            </div>
        </div>

        <v-container fluid class="stats-container">
            <v-row class="align-stretch">
                <v-col cols="12" md="6">
                    <OverviewStats />
                </v-col>
                <v-col cols="12" md="6">
                    <OverviewCharts />
                </v-col>
            </v-row>

            <v-row>
                <v-col cols="12" md="6">
                    <v-card class="bg-surface">
                        <template v-slot:subtitle>
                            <div class="pt-2">Latest Blocks</div>
                        </template>
                        <Block-List :dense="true" class="px-4 pb-4" />
                    </v-card>
                </v-col>

                <v-col cols="12" md="6">
                    <v-card class="bg-surface">
                        <template v-slot:subtitle>
                            <div class="pt-2">Latest Transactions</div>
                        </template>
                        <Transactions-List :dense="true" class="px-4 pb-4" />
                    </v-card>
                </v-col>
            </v-row>
        </v-container>
    </div>
</template>

<script setup>
import { useExplorerStore } from '../stores/explorer';

import TransactionsList from './TransactionsList.vue';
import BlockList from './BlockList.vue';
import OverviewCharts from './OverviewCharts.vue';
import SearchBar from './SearchBar.vue';
import OverviewStats from './OverviewStats.vue';

// Stores
const explorerStore = useExplorerStore();
</script>

<style scoped>
.overview {
    position: relative;
    width: 100%;
    min-height: 70vh;
    background: linear-gradient(to bottom, 
        rgba(var(--v-theme-primary), 0.95) 0%,
        rgba(var(--v-theme-primary), 0.7) 25%,
        rgb(var(--v-theme-background)) 50%
    );
}

.overview::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 70vh;
    background: 
        radial-gradient(circle at 100% 0%, currentColor 0%, transparent 35%),
        radial-gradient(circle at 0% 100%, currentColor 0%, transparent 35%),
        radial-gradient(2em 2em at 20% 20%, rgba(var(--v-theme-primary), 0.3) 0%, transparent 100%),
        radial-gradient(2em 2em at 80% 80%, rgba(var(--v-theme-primary), 0.3) 0%, transparent 100%),
        radial-gradient(2em 2em at 40% 60%, rgba(var(--v-theme-primary), 0.3) 0%, transparent 100%),
        radial-gradient(2em 2em at 60% 30%, rgba(var(--v-theme-primary), 0.3) 0%, transparent 100%),
        repeating-linear-gradient(45deg, 
            currentColor 0%, 
            currentColor 10px,
            transparent 10px, 
            transparent 20px
        ),
        repeating-linear-gradient(-45deg, 
            currentColor 0%, 
            currentColor 10px,
            transparent 10px, 
            transparent 20px
        );
    opacity: 0.1;
    mix-blend-mode: soft-light;
    mask-image: linear-gradient(to bottom, black 40%, transparent 80%);
    -webkit-mask-image: linear-gradient(to bottom, black 40%, transparent 80%);
    pointer-events: none;
    color: var(--v-theme-on-surface);
}

.search-hero {
    position: relative;
    min-height: 240px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.search-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
    position: relative;
    z-index: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.search-container h1 {
    margin: 0 0 2rem !important;
    color: rgb(var(--v-theme-on-primary));
    text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    width: 100%;
}

.stats-container {
    position: relative;
    margin-top: -3rem;
    z-index: 1;
}

.bg-surface {
    box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
}
</style>
