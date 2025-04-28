<template>
  <v-btn
    icon
    @click="toggleTheme"
    :title="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    <v-icon>{{ isDarkMode ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
  </v-btn>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useTheme } from 'vuetify';

const theme = useTheme();
const isDarkMode = ref(false);

// Initialize theme state
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  isDarkMode.value = savedTheme === 'dark';
  applyTheme();
};

// Apply theme changes
const applyTheme = () => {
  const themeName = isDarkMode.value ? 'dark' : 'light';
  theme.global.name.value = themeName;
  localStorage.setItem('theme', themeName);
  
  // Update body class for global theme styles
  if (isDarkMode.value) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
};

// Toggle theme handler
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  applyTheme();
};

// System theme preference handler
const updateThemeFromSystem = (e) => {
  // Only apply system preference if user hasn't explicitly chosen a theme
  if (!localStorage.getItem('theme')) {
    isDarkMode.value = e.matches;
    applyTheme();
  }
};

// Lifecycle hooks
onMounted(() => {
  initializeTheme();
  
  // Watch for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', updateThemeFromSystem);
});

onBeforeUnmount(() => {
  // Clean up event listener
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.removeEventListener('change', updateThemeFromSystem);
});
</script> 