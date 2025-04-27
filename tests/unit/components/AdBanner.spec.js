import AdBanner from '@/components/AdBanner.vue';

describe('AdBanner.vue', () => {
    let appendChildSpy;
    let getElementsByTagNameSpy;
    let scriptElement;
    let originalCreateElement;

    beforeEach(() => {
        // Store original createElement
        originalCreateElement = document.createElement;

        // Create a real script element for our ad script
        scriptElement = originalCreateElement.call(document, 'script');
        scriptElement.src = '';
        scriptElement.async = false;

        // Mock document.createElement
        document.createElement = vi.fn((type) => {
            if (type === 'script') {
                return scriptElement;
            }
            return originalCreateElement.call(document, type);
        });

        // Mock document.head.appendChild
        appendChildSpy = vi.spyOn(document.head, 'appendChild');

        // Mock document.getElementsByTagName
        getElementsByTagNameSpy = vi.spyOn(document, 'getElementsByTagName').mockReturnValue([
            { src: 'https://cdn.adx.ws/scripts/loader.js', remove: vi.fn() }
        ]);

        // Mock window.sevioads
        window.sevioads = [];
    });

    afterEach(() => {
        // Restore original createElement
        document.createElement = originalCreateElement;
        vi.clearAllMocks();
    });

    it('Should show the component', async () => {
        const wrapper = mount(AdBanner);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should load the ad script on mount', async () => {
        mount(AdBanner);

        expect(document.createElement).toHaveBeenCalledWith('script');
        expect(appendChildSpy).toHaveBeenCalledWith(scriptElement);
        expect(window.sevioads.length).toBe(1);
        expect(window.sevioads[0]).toEqual([{
            zone: '267ecf65-8e8c-45db-9b54-ad03098ebdb1',
            adType: 'banner',
            inventoryId: '7e76f5b3-3595-4e7e-adb2-763064612e3c',
            accountId: '4c3c03c6-9c27-4ab4-83d0-fd528c08cdcc'
        }]);
    });

    it('Should remove the script on unmount', async () => {
        const wrapper = mount(AdBanner);
        wrapper.unmount();

        expect(getElementsByTagNameSpy).toHaveBeenCalledWith('script');
    });
});
