import { computed } from 'vue';
import { useTheme } from 'vuetify';
import { getBestContrastingColor } from '@/lib/utils';

export function useContrastingColor(backgroundColor = null) {
    const theme = useTheme();
    
    const contrastingColor = computed(() => {
        return getBestContrastingColor(backgroundColor || theme.current.value.colors['surface-variant'], theme.current.value.colors);
    });

    return {
        contrastingColor
    };
}
