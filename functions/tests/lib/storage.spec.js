const Storage = require('../../lib/storage');
const Variables = require('../fixtures/InstanceDecoderVariables.json');

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

    it('Should build the structure', async () => {
        const storage = new Storage(instanceDecoderMock)
        storage.buildStructure().then(() => {
            expect(storage.structure).toMatchSnapshot();
        });
    });

    it('Should serialize to json', async () => {
        const storage = new Storage(instanceDecoderMock);
        storage.buildStructure().then(() => {
            expect(storage.toJSON()).toMatchSnapshot();
        });
    });

    it('Should decode the data', async () => {
        const storage = new Storage(instanceDecoderMock);
        storage.decodeData().then((data) => {
            expect(data).toMatchSnapshot();
            storage.buildStructure().then(() => {
                expect(storage.toJSON()).toMatchSnapshot();
            });
        });
    });

    it('Should return watched paths', async () => {
        const storage = new Storage(instanceDecoderMock);
        storage.buildStructure().then(() => {
            expect(storage.watchedPaths).toMatchSnapshot();
        });
    })
});
