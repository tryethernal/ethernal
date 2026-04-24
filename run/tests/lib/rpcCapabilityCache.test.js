require('../mocks/lib/logger');

jest.mock('../../lib/redis', () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
}));

const redis = require('../../lib/redis');
const cache = require('../../lib/rpcCapabilityCache');
const { _internals } = cache;

beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue('OK');
    redis.del.mockResolvedValue(1);
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);
});

describe('getHost', () => {
    it('extracts host:port from a URL', () => {
        expect(_internals.getHost('https://pre-rpc.bt.io/')).toBe('pre-rpc.bt.io');
        expect(_internals.getHost('http://130.60.144.77:8554/foo')).toBe('130.60.144.77:8554');
    });

    it('lowercases the host', () => {
        expect(_internals.getHost('https://RPC.Example.COM/')).toBe('rpc.example.com');
    });

    it('falls back to the raw input when the URL is unparseable', () => {
        expect(_internals.getHost('not a url at all')).toBe('not a url at all');
    });

    it('returns null for empty input', () => {
        expect(_internals.getHost('')).toBeNull();
        expect(_internals.getHost(null)).toBeNull();
        expect(_internals.getHost(undefined)).toBeNull();
    });
});

describe('isTraceDisabled', () => {
    it('returns false when no key exists', async () => {
        redis.get.mockResolvedValueOnce(null);
        await expect(cache.isTraceDisabled('https://rpc.example.com')).resolves.toBe(false);
        expect(redis.get).toHaveBeenCalledWith('rpc:cap:rpc.example.com:debug_trace:disabled');
    });

    it('returns true when key exists', async () => {
        redis.get.mockResolvedValueOnce('unsupported');
        await expect(cache.isTraceDisabled('https://rpc.example.com')).resolves.toBe(true);
    });

    it('returns true regardless of cached value (slow vs unsupported both disable)', async () => {
        redis.get.mockResolvedValueOnce('slow');
        await expect(cache.isTraceDisabled('https://rpc.example.com')).resolves.toBe(true);
    });

    it('fails open when Redis errors so a Redis blip never disables tracing', async () => {
        redis.get.mockRejectedValueOnce(new Error('redis down'));
        await expect(cache.isTraceDisabled('https://rpc.example.com')).resolves.toBe(false);
    });

    it('returns false for unparseable empty input', async () => {
        await expect(cache.isTraceDisabled('')).resolves.toBe(false);
        expect(redis.get).not.toHaveBeenCalled();
    });
});

describe('markTraceUnsupported', () => {
    it('sets the disabled key with 24h TTL', async () => {
        await cache.markTraceUnsupported('https://rpc.example.com');
        expect(redis.set).toHaveBeenCalledWith(
            'rpc:cap:rpc.example.com:debug_trace:disabled',
            'unsupported',
            'EX',
            _internals.UNSUPPORTED_TTL_SEC,
        );
    });

    it('swallows Redis errors', async () => {
        redis.set.mockRejectedValueOnce(new Error('redis down'));
        await expect(cache.markTraceUnsupported('https://rpc.example.com')).resolves.toBeUndefined();
    });
});

describe('markTraceSlow', () => {
    it('sets the disabled key with 1h TTL and clears the timeout counter', async () => {
        await cache.markTraceSlow('https://rpc.example.com');
        expect(redis.set).toHaveBeenCalledWith(
            'rpc:cap:rpc.example.com:debug_trace:disabled',
            'slow',
            'EX',
            _internals.SLOW_TTL_SEC,
        );
        expect(redis.del).toHaveBeenCalledWith('rpc:cap:rpc.example.com:debug_trace:timeouts');
    });
});

describe('recordTraceTimeout', () => {
    it('increments and sets the window TTL on first timeout', async () => {
        redis.incr.mockResolvedValueOnce(1);
        await cache.recordTraceTimeout('https://rpc.example.com');
        expect(redis.incr).toHaveBeenCalledWith('rpc:cap:rpc.example.com:debug_trace:timeouts');
        expect(redis.expire).toHaveBeenCalledWith(
            'rpc:cap:rpc.example.com:debug_trace:timeouts',
            _internals.TIMEOUT_WINDOW_SEC,
        );
        expect(redis.set).not.toHaveBeenCalled();
    });

    it('does not re-set the TTL on subsequent timeouts', async () => {
        redis.incr.mockResolvedValueOnce(2);
        await cache.recordTraceTimeout('https://rpc.example.com');
        expect(redis.expire).not.toHaveBeenCalled();
    });

    it('marks the host slow when threshold is reached', async () => {
        redis.incr.mockResolvedValueOnce(_internals.TIMEOUT_THRESHOLD);
        await cache.recordTraceTimeout('https://rpc.example.com');
        expect(redis.set).toHaveBeenCalledWith(
            'rpc:cap:rpc.example.com:debug_trace:disabled',
            'slow',
            'EX',
            _internals.SLOW_TTL_SEC,
        );
    });

    it('swallows Redis errors', async () => {
        redis.incr.mockRejectedValueOnce(new Error('redis down'));
        await expect(cache.recordTraceTimeout('https://rpc.example.com')).resolves.toBeUndefined();
    });
});

describe('recordTraceSuccess', () => {
    it('clears the timeout counter so transient blips do not accumulate', async () => {
        await cache.recordTraceSuccess('https://rpc.example.com');
        expect(redis.del).toHaveBeenCalledWith('rpc:cap:rpc.example.com:debug_trace:timeouts');
    });
});
