<!-- AdBanner.vue -->
<template>
  <div class="ad-banner">
    <div class="sevioads" :data-zone="zoneId"></div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

// Constants
const zoneId = '267ecf65-8e8c-45db-9b54-ad03098ebdb1'
const inventoryId = '7e76f5b3-3595-4e7e-adb2-763064612e3c'
const accountId = '4c3c03c6-9c27-4ab4-83d0-fd528c08cdcc'

// Lifecycle hooks
onMounted(() => {
  // Load the script
  const script = document.createElement('script')
  script.src = 'https://cdn.adx.ws/scripts/loader.js'
  script.async = true
  document.head.appendChild(script)

  // Initialize sevioads
  window.sevioads = window.sevioads || []
  const sevioads_preferences = [{
    zone: zoneId,
    adType: 'banner',
    inventoryId,
    accountId
  }]
  window.sevioads.push(sevioads_preferences)
})

onBeforeUnmount(() => {
  // Clean up script when component is destroyed
  const scripts = document.getElementsByTagName('script')
  for (let script of scripts) {
    if (script.src === 'https://cdn.adx.ws/scripts/loader.js') {
      script.remove()
    }
  }
})
</script>

<style scoped>
.ad-banner {
  width: 100%;
  min-height: 90px; /* Adjust based on your ad size */
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
}
</style>
