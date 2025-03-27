import { computed } from 'vue';
import { useTheme } from 'vuetify';
import { getBestContrastingColor } from '@/lib/utils';

export function useContrastingColor(backgroundColor = '#4242421f') {
    const theme = useTheme();
    
    const contrastingColor = computed(() => {
        return getBestContrastingColor(backgroundColor, theme.current.value.colors);
    });

    return {
        contrastingColor
    };
} 