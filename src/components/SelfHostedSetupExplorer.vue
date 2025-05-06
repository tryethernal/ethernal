<template>
  <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
  <v-form @submit.prevent="submit" v-model="valid" ref="form" class="mt-2">
    <v-text-field
      v-model="name"
      label="Explorer Name"
      :rules="nameRules"
      required
      class="mb-4"
    />
    <v-text-field
      v-model="rpcUrl"
      label="RPC URL"
      :rules="rpcRules"
      required
      class="mb-4"
    />
    <v-btn :loading="props.loading" color="primary" type="submit" :disabled="!valid || props.loading" block>
      Create Explorer
    </v-btn>
  </v-form>
</template>

<script setup>
import { ref, inject } from 'vue';
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
});
const emit = defineEmits(['explorer-created']);

const $server = inject('$server');

const name = ref('');
const rpcUrl = ref('');
const error = ref('');
const valid = ref(false);
const form = ref(null);

const nameRules = [
  v => !!v || 'Name is required',
];
const rpcRules = [
  v => !!v || 'RPC URL is required',
  v => /^https?:\/\//.test(v) || 'Must be a valid URL',
];

async function submit() {
  error.value = '';
  if (!valid.value) return;
  try {
    const { data: explorer } = await $server.createExplorerFromOptions(name.value, rpcUrl.value);
    emit('explorer-created', explorer);
  } catch (e) {
    error.value = e?.response?.data || e?.message || 'Failed to create explorer.';
  }
}
</script>
