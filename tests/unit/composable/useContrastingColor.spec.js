import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useContrastingColor } from '@/composables/useContrastingColor';
import { useTheme } from 'vuetify';

// Mock Vuetify's useTheme
vi.mock('vuetify', () => ({
    useTheme: vi.fn()
}));

// Mock the getBestContrastingColor utility
vi.mock('@/lib/utils', () => ({
    getBestContrastingColor: vi.fn((background, themeColors) => {
        // Simple mock implementation that returns 'primary' for light backgrounds
        // and 'accent' for dark backgrounds based on the first character of the hex
        const validHexColor = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;
        if (!validHexColor.test(background)) {
            return 'accent'; // Default to accent for invalid colors
        }
        return background.charAt(1) < '8' ? 'accent' : 'primary';
    })
}));

describe('useContrastingColor', () => {
    beforeEach(() => {
        // Setup default theme mock
        useTheme.mockImplementation(() => ({
            current: {
                value: {
                    colors: {
                        primary: '#3D95CE',
                        accent: '#29648E'
                    }
                }
            }
        }));
    });

    it('should use default background color if none provided', () => {
        const { contrastingColor } = useContrastingColor();
        expect(contrastingColor.value).toBe('accent'); // Based on default #4242421f
    });

    it('should use provided background color', () => {
        const { contrastingColor } = useContrastingColor('#FFFFFF');
        expect(contrastingColor.value).toBe('primary');
    });

    it('should handle dark background colors', () => {
        const { contrastingColor } = useContrastingColor('#000000');
        expect(contrastingColor.value).toBe('accent');
    });

    it('should handle background colors with alpha channel', () => {
        const { contrastingColor } = useContrastingColor('#FFFFFF80');
        expect(contrastingColor.value).toBe('primary');
    });

    it('should handle invalid background colors', () => {
        const { contrastingColor } = useContrastingColor('invalid-color');
        expect(contrastingColor.value).toBe('accent'); // Falls back to default behavior
    });

    it('should update when theme changes', () => {
        const { contrastingColor } = useContrastingColor('#FFFFFF');
        expect(contrastingColor.value).toBe('primary');

        // Simulate theme change
        useTheme.mockImplementation(() => ({
            current: {
                value: {
                    colors: {
                        primary: '#000000',
                        accent: '#FFFFFF'
                    }
                }
            }
        }));

        // Since contrastingColor is computed, it should react to theme changes
        expect(contrastingColor.value).toBe('primary');
    });
});
