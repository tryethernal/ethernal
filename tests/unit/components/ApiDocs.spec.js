import { setActivePinia, createPinia } from 'pinia';
import { useExplorerStore } from '@/stores/explorer';
import ApiDocs from '@/components/ApiDocs.vue';
import router from '@/plugins/router';
import fixture from '../fixtures/OpenApi.json';

const CENTRAL_DOCS_URL = 'https://tryethernal.com/docs/api';

describe('ApiDocs.vue', () => {
    let pinia, explorerStore, replace, originalLocation, wrapper;

    const mountDocs = () => {
        wrapper = mount(ApiDocs, { global: { plugins: [pinia] }, attachTo: document.body });
        return wrapper;
    };

    beforeEach(() => {
        vi.useRealTimers();
        pinia = createPinia();
        setActivePinia(pinia);
        explorerStore = useExplorerStore();

        replace = vi.fn();
        originalLocation = window.location;
        Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, replace } });

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: new Headers(),
            text: async () => JSON.stringify(fixture),
            json: async () => fixture
        });
    });

    afterEach(() => {
        wrapper?.unmount();
        wrapper = null;
        Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
        document.body.className = '';
    });

    describe('on a public explorer', () => {
        beforeEach(() => {
            explorerStore.id = 1;
        });

        it('Should render the reference built from the explorer OpenAPI document', async () => {
            mountDocs();

            await vi.waitFor(() => {
                expect(document.body.textContent).toContain(fixture.info.title);
                expect(document.body.textContent).toContain('List blocks');
            }, { timeout: 10000 });

            expect(global.fetch.mock.calls.map(c => c[0])).toContain('/api/openapi.json');
            expect(replace).not.toHaveBeenCalled();
        }, 15000);

        it('Should follow the app theme and use its primary color as accent', async () => {
            const theme = mountDocs().vm.$vuetify.theme;
            await vi.waitFor(() => expect(document.body.classList.contains('light-mode')).toBe(true));

            const accent = theme.current.colors.primary;
            await vi.waitFor(() => {
                const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
                expect(css).toContain(`--scalar-color-accent: ${accent}`);
            });

            theme.name = 'dark';
            await vi.waitFor(() => expect(document.body.classList.contains('dark-mode')).toBe(true));
            expect(document.body.classList.contains('light-mode')).toBe(false);
        }, 15000);

        it('Should leave the body theme class in line with the app when leaving the page', async () => {
            const theme = mountDocs().vm.$vuetify.theme;
            theme.name = 'light';
            await vi.waitFor(() => expect(document.body.classList.contains('light-mode')).toBe(true));

            wrapper.unmount();
            wrapper = null;

            expect(document.body.classList.contains('light-mode')).toBe(false);
            expect(document.body.classList.contains('dark-mode')).toBe(false);
        }, 15000);
    });

    describe('in dashboard mode (no public explorer)', () => {
        it('Should redirect to the central API reference without rendering anything', () => {
            explorerStore.id = null;
            mountDocs();

            expect(replace).toHaveBeenCalledTimes(1);
            expect(replace).toHaveBeenCalledWith(CENTRAL_DOCS_URL);
            expect(wrapper.find('.api-docs').exists()).toBe(false);
            expect(global.fetch).not.toHaveBeenCalled();
        });
    });
});

describe('/docs/api route', () => {
    it('Should be registered and lazy-load the ApiDocs component', async () => {
        const resolved = router.resolve('/docs/api');
        const record = resolved.matched[0];

        expect(resolved.name).toBe('api-docs');
        expect(record.components.default).toBeTypeOf('function');
        expect(record.components.default.length).toBe(0);

        const loaded = await record.components.default();
        expect(loaded.default.__file).toContain('ApiDocs.vue');
    });

    it('Should not be swallowed by the catch-all route', () => {
        expect(router.resolve('/docs/api').name).not.toBe('not-found');
        expect(router.resolve('/docs/unknown').name).toBe('not-found');
    });
});
