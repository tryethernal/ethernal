const { expect } = require('chai');
const { Explorer } = require('../../models/explorer');

describe('Explorer model', () => {
  describe('createExplorerFromOptions', () => {
    it('should throw an error if workspaceId is missing', () => {
      expect(() => Explorer.createExplorerFromOptions({})).to.throw();
    });
    it('should create an explorer if all required parameters are provided', () => {
      const explorer = Explorer.createExplorerFromOptions({ workspaceId: 'test', rpcServer: 'test', name: 'test', networkId: 'test' });
      expect(explorer).to.be.an('object');
      expect(explorer.workspaceId).to.equal('test');
      expect(explorer.rpcServer).to.equal('test');
      expect(explorer.name).to.equal('test');
      expect(explorer.networkId).to.equal('test');
    });
    it('should throw an error if an explorer already exists for the workspace', () => {
      beforeEach(async () => {
        // Create an explorer for the workspace
      });
      expect(() => Explorer.createExplorerFromOptions({ workspaceId: 'test', rpcServer: 'test', name: 'test', networkId: 'test' })).to.throw();
    });
    it('should throw an error if totalSupply is not a valid string', () => {
      expect(() => Explorer.createExplorerFromOptions({ workspaceId: 'test', rpcServer: 'test', name: 'test', networkId: 'test', totalSupply: 'invalid' })).to.throw();
    });
  });
  describe('safeCreateFaucet', () => {
    beforeEach(async () => {
      // Create a faucet for the explorer
    });
    it('should throw an error if a faucet already exists for the explorer', () => {
      expect(() => Explorer.safeCreateFaucet('amount', 'interval')).to.throw();
    });
  });
});