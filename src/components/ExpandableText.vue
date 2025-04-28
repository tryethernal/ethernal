<template>
  <div class="expandable-text">
      <div class="d-block overflow-auto pr-10" style="white-space: pre-wrap;">
        <template v-if="pre">
          <pre style="white-space: pre-wrap;">{{ displayText }}</pre>
        </template>
        <template v-else>
          {{ displayText }}
        </template>
      </div>
      <div class="copy-btn-container">
        <v-btn
          size="small" 
          color="primary"
          variant="text" 
          @click="copyToClipboard" 
          v-tooltip="'Copy to clipboard'"
        >
          <v-icon>{{ hasCopied ? 'mdi-check' : 'mdi-content-copy' }}</v-icon>
        </v-btn>
      </div>
    
    <!-- Toggle button -->
    <div v-if="needsTruncation" class="text-center mt-2">
      <a href="#" class="no-decoration text-uppercase d-flex align-center justify-center" @click.prevent="toggleExpand">
        <v-icon size="small" class="mr-1">mdi-eye{{ isExpanded ? '-off' : '' }}</v-icon>
        {{ isExpanded ? 'VIEW LESS' : 'VIEW ALL' }}
      </a>
    </div>
    <!-- Hidden input for fallback copy method -->
    <input type="hidden" ref="copyElement" :value="rawText">
  </div>
</template>

<script setup>
import { ref, computed, useSlots } from 'vue';

const props = defineProps({
  text: {
    type: String,
    default: ''
  },
  maxChars: {
    type: Number,
    default: 500
  },
  pre: {
    type: Boolean,
    default: false
  }
});

// Emit events when expansion state changes
const emit = defineEmits(['expand', 'collapse']);

const slots = useSlots();
const isExpanded = ref(false);
const hasCopied = ref(false);
const copyElement = ref(null);

const displayText = computed(() => {
  if (isExpanded.value || rawText.value.length <= props.maxChars) {
    return rawText.value;
  }
  return rawText.value.substring(0, props.maxChars) + '...';
});

const rawText = computed(() => {
  return slots.default ? slots.default()[0].children : props.text;
});

const needsTruncation = computed(() => {
  return rawText.value.length > props.maxChars;
});

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
  
  // Emit appropriate event
  if (isExpanded.value) {
    emit('expand');
  } else {
    emit('collapse');
  }
};

const copyToClipboard = async () => {
    // Fall back to execCommand method if navigator.clipboard fails
    try {
      const element = copyElement.value;
      element.setAttribute('type', 'text');
      element.select();
      document.execCommand('copy');
      hasCopied.value = true;
      setTimeout(() => {
        hasCopied.value = false;
      }, 2000);
    } catch (fallbackError) {
      console.error('Failed to copy text with fallback method: ', fallbackError);
    } finally {
      if (copyElement.value) {
        copyElement.value.setAttribute('type', 'hidden');
        window.getSelection().removeAllRanges();
      }
    }
};
</script>

<style scoped>
.expandable-text {
  position: relative;
  margin-bottom: 4px;
  background-color: transparent;
}

.copy-btn-container {
  position: absolute;
  top: 0px;
  right: 0px;
}

.no-decoration {
  text-decoration: none;
}

pre {
  background-color: transparent;
  margin: 0;
  padding: 8px;
  font-family: monospace;
}

/* Dark mode support */
:deep(.v-theme--dark) {
  .expandable-text,
  pre {
    background-color: transparent;
  }
}
</style> 