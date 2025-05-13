<template>
  <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
  <v-form @submit.prevent="submit" v-model="valid" ref="form" class="mt-2">
    <v-text-field
      v-model="email"
      label="Email"
      type="email"
      :rules="emailRules"
      required
      autocomplete="email"
    />
    <v-text-field
      v-model="password"
      label="Password"
      type="password"
      :rules="passwordRules"
      required
      autocomplete="new-password"
      class="mb-4 mt-1"
    />
    <v-btn :loading="props.loading || submitting" color="primary" type="submit" :disabled="!valid || props.loading || submitting" block>
      Create User
    </v-btn>
  </v-form>
</template>

<script setup>
import { ref, inject } from 'vue';

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
});
const emit = defineEmits(['user-created']);

const $server = inject('$server');

const email = ref('');
const password = ref('');
const error = ref('');
const valid = ref(false);
const form = ref(null);
const submitting = ref(false);

const emailRules = [
  v => !!v || 'Email is required',
  v => /.+@.+\..+/.test(v) || 'E-mail must be valid',
];
const passwordRules = [
  v => !!v || 'Password is required'
];

async function submit() {
  error.value = '';
  if (!valid.value) return;
  submitting.value = true;
  try {
    const response = await $server.setupAdmin(email.value, password.value);
    // Store apiToken in localStorage if present in response
    if (response && response.data && response.data.user && response.data.user.apiToken) {
      localStorage.setItem('apiToken', response.data.user.apiToken);
    }
    emit('user-created');
  } catch (e) {
    error.value = e?.response?.data || e?.message || 'Failed to create user.';
  } finally {
    submitting.value = false;
  }
}
</script>
