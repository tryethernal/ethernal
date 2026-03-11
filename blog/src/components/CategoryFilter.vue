<!--
  @fileoverview Interactive category filter for blog homepage.
  @component CategoryFilter
  @emits filter-change - Emitted when active category changes
-->
<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="cat in categories"
      :key="cat"
      :class="[
        'category-pill',
        activeCategory === cat ? 'category-pill-active' : 'category-pill-inactive'
      ]"
      @click="setCategory(cat)"
    >
      {{ cat }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  categories: string[];
}>();

const activeCategory = ref('All');

function setCategory(cat: string) {
  activeCategory.value = cat;
  const event = new CustomEvent('filter-change', { detail: cat });
  document.dispatchEvent(event);
}
</script>
