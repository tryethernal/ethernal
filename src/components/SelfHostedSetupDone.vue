<template>
  <div class="text-center py-8">
    <v-icon color="success" size="64">mdi-check-circle</v-icon>
    <h2 class="my-4">Setup Complete!</h2>
    <div v-if="explorer">
      <div class="mb-2">
        <span>Your explorer is now live at:</span>
        <br />
        <a class="font-weight-bold text-primary text-decoration-none" :href="explorerUrl" target="_blank">{{ explorerUrl }}</a>
      </div>
      <div class="mt-6 d-flex flex-column align-center useful-links-compact">
        <h3 class="mb-2">Useful Links</h3>
        <ul class="compact-link-list">
          <li class="d-flex align-center">
            <v-icon color="grey lighten-1" size="18" class="mr-1">mdi-cog</v-icon>
            <a target="_blank" :href="`/explorers/${props.explorer.id}`" class="compact-link text-medium-emphasis text-primary text-decoration-none">
              Explorer Settings
            </a>
          </li>
          <li class="d-flex align-center">
            <v-icon color="grey lighten-1" size="18" class="mr-1">mdi-view-dashboard</v-icon>
            <a target="_blank" href="/" class="compact-link text-medium-emphasis text-primary text-decoration-none">
              Ethernal Dashboard
            </a>
          </li>
          <li class="d-flex align-center">
            <v-icon color="grey lighten-1" size="18" class="mr-1">mdi-compass</v-icon>
            <a target="_blank" href="/explorers" class="compact-link text-medium-emphasis text-primary text-decoration-none">
              My Explorers
            </a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  explorer: {
    type: Object,
    required: true
  }
});

const explorerUrl = computed(() => {
  if (props.explorer.domains && props.explorer.domains.length > 0) {
    return `https://${props.explorer.domains[0].domain}`;
  }
  if (props.explorer.domain) {
    return `https://${props.explorer.domain}`;
  }
  if (props.explorer.slug) {
    return `https://${props.explorer.slug}.${window.location.host}`;
  }
  return window.location.origin;
});
</script>

<style scoped>
.useful-links-compact {
  margin-top: 1.5rem;
}
.compact-link-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.compact-link-list li {
  margin-bottom: 4px;
}
.compact-link {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 15px;
  text-decoration: underline;
  background: transparent;
  transition: background 0.15s;
  font-weight: 500;
  gap: 2px;
}
</style>
