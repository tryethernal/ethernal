import { Storage } from '@/lib/storage.js';
import Variables from '../fixtures/InstanceDecoderVariables.json'

describe('Storage', () => {
    let storage, instanceDecoderMock;

    beforeEach(async () => {
        instanceDecoderMock = {
            variables: () => {
                return new Promise((resolve) => resolve(Variables));
            },
            watchMappingKey: () => {
                return new Promise((resolve) => resolve(true));
            }
        };
    });

    it('Should build the structure', async (done) => {
        const storage = new Storage(instanceDecoderMock)
        storage.buildStructure().then(() => {
            expect(storage.structure).toMatchSnapshot();
            done();
        });
    });

    it('Should serialize to json', async (done) => {
        const storage = new Storage(instanceDecoderMock);
        storage.buildStructure().then(() => {
            expect(storage.toJSON()).toMatchSnapshot();
            done();
        });
    });

    it('Should decode the data', async (done) => {
        const storage = new Storage(instanceDecoderMock);
        storage.decodeData().then((data) => {
            expect(data).toMatchSnapshot();
            storage.buildStructure().then(() => {
                expect(storage.toJSON()).toMatchSnapshot();
                done();
            });
        });
    });

    it('Should return watched paths', async (done) => {
        const storage = new Storage(instanceDecoderMock);
        storage.buildStructure().then(() => {
            expect(storage.watchedPaths).toMatchSnapshot();
            done();
        });
    })
});
