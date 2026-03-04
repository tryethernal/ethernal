import { ref, onMounted, onUnmounted, nextTick } from 'vue';

/**
 * IntersectionObserver composable for one-time fade-in animations.
 * @param {Object} [options] - Observer options
 * @param {number} [options.threshold=0.15] - Visibility threshold to trigger
 * @returns {{ elementRef: Ref, isVisible: Ref<boolean> }}
 */
export function useScrollReveal(options = {}) {
    const elementRef = ref(null);
    const isVisible = ref(false);
    let observer = null;

    onMounted(async () => {
        await nextTick();
        if (!elementRef.value) return;
        observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                isVisible.value = true;
                observer.disconnect();
            }
        }, { threshold: options.threshold ?? 0.15 });
        observer.observe(elementRef.value);
    });

    onUnmounted(() => {
        observer?.disconnect();
    });

    return { elementRef, isVisible };
}
