import ThemeToggle from '@/components/ThemeToggle.vue';

describe('ThemeToggle.vue', () => {
    let mockMatchMedia;
    let mockLocalStorage;

    beforeEach(() => {
        // Mock localStorage
        mockLocalStorage = {
            getItem: vi.fn(),
            setItem: vi.fn()
        };
        Object.defineProperty(window, 'localStorage', {
            value: mockLocalStorage
        });

        // Mock matchMedia
        mockMatchMedia = vi.fn().mockReturnValue({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        });
        Object.defineProperty(window, 'matchMedia', {
            value: mockMatchMedia
        });
    });

    it('should render with light theme by default', async () => {
        mockLocalStorage.getItem.mockReturnValue(null);
        
        const wrapper = mount(ThemeToggle);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('should render with dark theme when saved in localStorage', async () => {
        mockLocalStorage.getItem.mockReturnValue('dark');
        
        const wrapper = mount(ThemeToggle);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('should toggle theme when button is clicked', async () => {
        mockLocalStorage.getItem.mockReturnValue('light');
        
        const wrapper = mount(ThemeToggle);
        await flushPromises();

        await wrapper.find('button').trigger('click');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    });
});
