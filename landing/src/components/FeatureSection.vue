<template>
    <div
        ref="elementRef"
        :class="['reveal', { visible: isVisible }]"
    >
        <v-row align="center" :class="['feature-row', compact ? 'my-8' : 'my-10']">
            <v-col cols="12" md="6" :class="reverse ? 'feature-image' : 'feature-text'">
                <div v-if="!reverse || hasImage || hasVisual" :class="reverse ? '' : 'pr-md-10'">
                    <template v-if="!reverse">
                        <template v-if="inlineIcon && icon">
                            <div class="d-flex align-center ga-3 mb-3">
                                <v-icon color="#5DAAE0" size="24">{{ icon }}</v-icon>
                                <h3 class="font-heading" style="font-weight: 600; color: #F1F5F9; font-size: 1.15rem;">{{ title }}</h3>
                            </div>
                        </template>
                        <template v-else>
                            <v-icon v-if="icon" color="#5DAAE0" size="32" class="mb-4">{{ icon }}</v-icon>
                            <h3 class="font-heading mb-3" style="font-weight: 600; color: #F1F5F9; font-size: 1.15rem;">{{ title }}</h3>
                        </template>
                        <p style="color: #94A3B8; line-height: 1.7; font-size: 1.05rem;">{{ description }}</p>
                        <slot name="extra" />
                    </template>
                    <template v-else-if="hasVisual">
                        <slot name="visual" />
                    </template>
                    <template v-else>
                        <div class="glass-card overflow-hidden">
                            <img :src="image" :alt="title" style="width: 100%; display: block;" />
                        </div>
                    </template>
                </div>
            </v-col>
            <v-col cols="12" md="6" :class="reverse ? 'feature-text' : 'feature-image'">
                <div v-if="reverse || hasImage || hasVisual" :class="reverse ? 'pl-md-10' : ''">
                    <template v-if="reverse">
                        <template v-if="inlineIcon && icon">
                            <div class="d-flex align-center ga-3 mb-3">
                                <v-icon color="#5DAAE0" size="24">{{ icon }}</v-icon>
                                <h3 class="font-heading" style="font-weight: 600; color: #F1F5F9; font-size: 1.15rem;">{{ title }}</h3>
                            </div>
                        </template>
                        <template v-else>
                            <v-icon v-if="icon" color="#5DAAE0" size="32" class="mb-4">{{ icon }}</v-icon>
                            <h3 class="font-heading mb-3" style="font-weight: 600; color: #F1F5F9; font-size: 1.15rem;">{{ title }}</h3>
                        </template>
                        <p style="color: #94A3B8; line-height: 1.7; font-size: 1.05rem;">{{ description }}</p>
                        <slot name="extra" />
                    </template>
                    <template v-else-if="hasVisual">
                        <slot name="visual" />
                    </template>
                    <template v-else>
                        <div v-if="hasImage" class="glass-card overflow-hidden">
                            <img :src="image" :alt="title" style="width: 100%; display: block;" />
                        </div>
                    </template>
                </div>
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { useScrollReveal } from '@/composables/useScrollReveal';

const props = defineProps({
    icon: String,
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: String,
    reverse: Boolean,
    inlineIcon: Boolean,
    compact: Boolean
});

const slots = defineSlots();
const hasImage = computed(() => !!props.image);
const hasVisual = computed(() => !!slots.visual);
const { elementRef, isVisible } = useScrollReveal();
</script>
