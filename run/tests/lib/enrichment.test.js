require('../mocks/lib/env');

const { resolveDomain } = require('../../lib/enrichment');

describe('resolveDomain', () => {
    it('returns domain from corporate email', () => {
        expect(resolveDomain('john@acmelabs.xyz', 'https://rpc.ankr.com/eth'))
            .toEqual({ domain: 'acmelabs.xyz', source: 'email' });
    });

    it('skips free email and falls back to RPC domain', () => {
        expect(resolveDomain('john@gmail.com', 'https://rpc.acmelabs.xyz/v1'))
            .toEqual({ domain: 'acmelabs.xyz', source: 'rpc' });
    });

    it('returns null for free email + public RPC', () => {
        expect(resolveDomain('john@gmail.com', 'https://rpc.ankr.com/eth'))
            .toBeNull();
    });

    it('returns null for free email + no RPC', () => {
        expect(resolveDomain('john@gmail.com', null))
            .toBeNull();
    });

    it('strips subdomains from RPC URLs', () => {
        expect(resolveDomain('john@hotmail.com', 'https://rpc.mychain.io/v1'))
            .toEqual({ domain: 'mychain.io', source: 'rpc' });
    });

    it('handles RPC URLs with ports', () => {
        expect(resolveDomain('john@yahoo.com', 'https://rpc.mychain.io:8545'))
            .toEqual({ domain: 'mychain.io', source: 'rpc' });
    });

    it('returns null for IP-based RPC URLs', () => {
        expect(resolveDomain('john@gmail.com', 'http://192.168.1.1:8545'))
            .toBeNull();
    });

    it('skips common public RPC providers', () => {
        const providers = [
            'https://eth-mainnet.g.alchemy.com/v2/key',
            'https://mainnet.infura.io/v3/key',
            'https://rpc.publicnode.com',
            'https://eth.llamarpc.com',
        ];
        providers.forEach(rpc => {
            expect(resolveDomain('john@gmail.com', rpc)).toBeNull();
        });
    });
});
