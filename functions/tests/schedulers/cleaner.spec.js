const moment = require('moment');
const index = require('../../index');
const Helper = require('../helper');
const AmalfiContract = require('../fixtures/AmalfiContract');
let helper, contractArtifact, contractDependency;

describe('cleanArtifactDependencies', () => {
    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);

        contractArtifact = JSON.stringify(AmalfiContract.artifact);
        contractDependency = JSON.stringify(AmalfiContract.dependencies['Address']);
        await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123/artifact').set(contractArtifact);
        await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123/dependencies').update({ Address: contractDependency });
        await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123').update({ updatedAt: moment().unix() });
    });

    it('Should leave less than 1 week old artifact for free users', async () => {
        await helper.setUser({ plan: 'free' });
        const result = await helper.test.wrap(index.cleanArtifactDependencies)();

        const artifactRef = await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123').once('value');

        expect(artifactRef.val()).toEqual({ artifact: contractArtifact, dependencies: { Address: contractDependency }, updatedAt: expect.anything() });
    });

    it('Should remove more than 1 week old artifacts for free users', async () => {
        await helper.setUser({ plan: 'free' });
        await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123').update({ updatedAt: moment().subtract(8, 'days').unix() });
        const result = await helper.test.wrap(index.cleanArtifactDependencies)();
        const artifactRef = await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123').once('value');

        expect(artifactRef.val()).toBeNull();
    });

    it('Should leave more than 1 week old artifact for premium users', async () => {
        await helper.setUser({ plan: 'premium' });
        await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123').update({ updatedAt: moment().subtract(8, 'days').unix() });
        const result = await helper.test.wrap(index.cleanArtifactDependencies)();
        const artifactRef = await helper.database.ref('/users/123/workspaces/hardhat/contracts/0x123').once('value');

        expect(artifactRef.val()).toEqual({ artifact: contractArtifact, dependencies: { Address: contractDependency }, updatedAt: expect.anything() });
    });

    afterEach(() => helper.clean());
});
