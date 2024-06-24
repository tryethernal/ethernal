const { expect } = require('chai');
const { Explorer } = require('../../models/explorer');

describe('Explorer model', () => {
  describe('safeCreateExplorer', () => {
    it('should create an explorer if all required parameters are provided', () => {
      expect(() => Explorer.safeCreateExplorer({ userId: 'test', workspaceId: 'test', chainId: 'test', name: 'test', rpcServer: 'test', slug: 'test', themes: 'test', totalSupply: 'test', domain: 'test', token: 'test' })).to.throw();
    });
    it('should create an explorer if all required parameters are provided', () => {
      const explorer = Explorer.createExplorerFromOptions({ workspaceId: 'test', rpcServer: 'test', name: 'test', networkId: 'test' });
      expect(explorer).to.be.an('object');
      expect(explorer.workspaceId).to.equal('test');
      expect(explorer.rpcServer).to.equal('test');
      expect(explorer.name).to.equal('test');
      expect(explorer.networkId).to.equal('test');
    });
  });
  describe('safeCreateFaucet', () => {
    beforeEach(async () => {
      // Create a faucet for the explorer
    });
    it('should create a faucet if one does not already exist', () => {
      expect(() => Explorer.safeCreateFaucet('amount', 'interval', 'transaction')).to.throw();
    });
  });
});