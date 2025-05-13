<template>
  <v-app class="setup-bg">
    <v-container class="d-flex align-center justify-center setup-container" fluid>
      <v-row align="center" justify="center" class="w-100">
        <v-col cols="12" md="7" lg="5">
          <v-card class="pa-8 setup-card" elevation="10">
            <div class="d-flex justify-center align-center mb-8">
              <h1 class="ml-3 mb-0 setup-title">Welcome! Let's Get Your Ethernal Instance Ready</h1>
            </div>
            <div class="wizard-stepper d-flex justify-space-between align-center mb-8">
              <div class="wizard-step" :class="{ active: step === 1, done: step > 1 }">
                <v-icon class="step-icon" :color="step === 1 ? 'primary' : 'grey-lighten-1'" size="22">mdi-account-plus</v-icon>
                <span class="step-label">Create Admin User</span>
              </div>
              <v-icon v-if="true" class="wizard-arrow" size="20" color="grey-lighten-1">mdi-arrow-right-thin</v-icon>
              <div class="wizard-step" :class="{ active: step === 2, done: step > 2 }">
                <v-icon class="step-icon" :color="step === 2 ? 'primary' : 'grey-lighten-1'" size="22">mdi-rocket-launch-outline</v-icon>
                <span class="step-label">Create Explorer</span>
              </div>
              <v-icon v-if="true" class="wizard-arrow" size="20" color="grey-lighten-1">mdi-arrow-right-thin</v-icon>
              <div class="wizard-step" :class="{ active: step === 3 }">
                <v-icon class="step-icon" :color="step === 3 ? 'primary' : 'grey-lighten-1'" size="22">mdi-check-circle-outline</v-icon>
                <span class="step-label">Done</span>
              </div>
            </div>

            <v-divider class="mb-7"></v-divider>

            <v-window v-model="step">
              <v-window-item :value="1">
                <SelfHostedSetupUser @user-created="onUserCreated" :loading="loading" />
              </v-window-item>
              <v-window-item :value="2">
                <SelfHostedSetupExplorer @explorer-created="onExplorerCreated" :loading="loading" />
              </v-window-item>
              <v-window-item :value="3">
                <SelfHostedSetupDone :explorer="explorer" />
              </v-window-item>
            </v-window>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import SelfHostedSetupUser from './SelfHostedSetupUser.vue';
import SelfHostedSetupExplorer from './SelfHostedSetupExplorer.vue';
import SelfHostedSetupDone from './SelfHostedSetupDone.vue';

const step = ref(1);
const loading = ref(false);
const explorer = ref(null);

function onUserCreated() {
  step.value = 2;
}

function onExplorerCreated(explorerData) {
  explorer.value = explorerData;
  step.value = 3;
}

onMounted(() => {
  if (localStorage.getItem('apiToken')) {
    step.value = 2;
  }
});
</script>

<style scoped>
.setup-bg {
  min-height: 100vh;
  min-width: 100vw;
  background: linear-gradient(180deg, #f8fafc 0%, #f3f4f6 100%);
}
.setup-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.setup-card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 32px rgba(0,0,0,0.08);
}
.setup-title {
  font-weight: 700;
  font-size: 1.4rem;
  letter-spacing: -1px;
}
.wizard-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.wizard-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 90px;
  opacity: 0.5;
  transition: opacity 0.2s, color 0.2s;
}
.wizard-step.active {
  opacity: 1;
}
.wizard-step.done {
  opacity: 0.8;
}
.step-icon {
  margin-bottom: 2px;
}
.step-label {
  font-size: 1rem;
  font-weight: 500;
  margin-top: 2px;
  text-align: center;
}
.wizard-arrow {
  margin: 0 8px 0 8px;
  opacity: 0.5;
  vertical-align: middle;
}
</style> 