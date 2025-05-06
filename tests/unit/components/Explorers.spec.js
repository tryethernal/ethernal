import Explorers from '@/components/Explorers.vue';
import server from '../mocks/server';

vi.mock('vue-router', () => ({
    useRoute: () => ({
        query: {}
    })
}));

const stubs = ['CreateExplorerModal'];

describe('Explorers.vue', () => {
    beforeEach(() => {
        Object.keys(server).forEach(key => {
            if (typeof server[key] === 'function' && 'mockReset' in server[key]) {
                server[key].mockReset();
            }
        });
    });

    console.log($server)
