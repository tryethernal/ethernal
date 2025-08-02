const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { getOrbitConfig } = require('../lib/orbitConfig');
const logger = require('../lib/logger');

const config = getOrbitConfig();

/**
 * Rate limiter for general orbit API endpoints
 */
const orbitApiLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    message: {
        error: 'Too many requests',
        message: `Rate limit exceeded. Maximum ${config.RATE_LIMIT_MAX_REQUESTS} requests per ${config.RATE_LIMIT_WINDOW / 1000} seconds.`,
        retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit by workspace + IP for better granularity
        const workspaceId = req.workspace?.id || req.query.workspaceId || req.params.workspaceId || 'unknown';
        const ip = req.ip || req.connection.remoteAddress;
        return `orbit-api:${workspaceId}:${ip}`;
    },
    handler: (req, res) => {
        const workspaceId = req.workspace?.id || 'unknown';
        logger.warn('Orbit API rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.path,
            workspaceId,
            method: req.method
        });
        
        res.status(429).json({
            error: 'Too many requests',
            message: `Rate limit exceeded. Maximum ${config.RATE_LIMIT_MAX_REQUESTS} requests per ${config.RATE_LIMIT_WINDOW / 1000} seconds.`,
            retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW / 1000)
        });
    },
    onLimitReached: (req, res, options) => {
        logger.warn('Orbit API rate limit threshold reached', {
            ip: req.ip,
            endpoint: req.path,
            workspaceId: req.workspace?.id || 'unknown'
        });
    }
});

/**
 * Stricter rate limiter for expensive operations (contract validation, processing)
 */
const orbitExpensiveLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW * 5, // 5 minute window
    max: Math.floor(config.RATE_LIMIT_MAX_REQUESTS / 10), // 10x stricter
    message: {
        error: 'Too many expensive requests',
        message: 'Rate limit exceeded for expensive operations. Please wait before retrying.',
        retryAfter: Math.ceil((config.RATE_LIMIT_WINDOW * 5) / 1000)
    },
    keyGenerator: (req) => {
        const workspaceId = req.workspace?.id || req.query.workspaceId || req.params.workspaceId || 'unknown';
        const ip = req.ip || req.connection.remoteAddress;
        return `orbit-expensive:${workspaceId}:${ip}`;
    },
    handler: (req, res) => {
        logger.warn('Orbit expensive operation rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.path,
            workspaceId: req.workspace?.id || 'unknown',
            method: req.method
        });
        
        res.status(429).json({
            error: 'Too many expensive requests',
            message: 'Rate limit exceeded for expensive operations. Please wait before retrying.',
            retryAfter: Math.ceil((config.RATE_LIMIT_WINDOW * 5) / 1000)
        });
    }
});

/**
 * Speed limiter for gradual slowdown before hard limit
 */
const orbitSpeedLimiter = slowDown({
    windowMs: config.RATE_LIMIT_WINDOW,
    delayAfter: Math.floor(config.RATE_LIMIT_MAX_REQUESTS * 0.7), // Start slowing down at 70%
    delayMs: 500, // Delay by 500ms
    maxDelayMs: 5000, // Maximum delay of 5 seconds
    keyGenerator: (req) => {
        const workspaceId = req.workspace?.id || req.query.workspaceId || req.params.workspaceId || 'unknown';
        const ip = req.ip || req.connection.remoteAddress;
        return `orbit-speed:${workspaceId}:${ip}`;
    },
    onLimitReached: (req, res, options) => {
        logger.info('Orbit API speed limit engaged', {
            ip: req.ip,
            endpoint: req.path,
            workspaceId: req.workspace?.id || 'unknown',
            delayMs: options.delay
        });
    }
});

/**
 * Contract validation rate limiter (very strict)
 */
const orbitContractValidationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: config.MAX_CONTRACT_CALLS_PER_MINUTE,
    message: {
        error: 'Contract validation rate limit exceeded',
        message: `Too many contract validation requests. Maximum ${config.MAX_CONTRACT_CALLS_PER_MINUTE} per minute.`,
        retryAfter: 60
    },
    keyGenerator: (req) => {
        // Rate limit contract validation by workspace only (not IP)
        // as these are expensive RPC operations
        const workspaceId = req.workspace?.id || req.query.workspaceId || req.params.workspaceId || 'unknown';
        return `orbit-contract-validation:${workspaceId}`;
    },
    handler: (req, res) => {
        logger.warn('Orbit contract validation rate limit exceeded', {
            ip: req.ip,
            workspaceId: req.workspace?.id || 'unknown',
            endpoint: req.path
        });
        
        res.status(429).json({
            error: 'Contract validation rate limit exceeded',
            message: `Too many contract validation requests. Maximum ${config.MAX_CONTRACT_CALLS_PER_MINUTE} per minute.`,
            retryAfter: 60
        });
    }
});

/**
 * Input validation middleware for orbit endpoints
 */
const orbitInputValidation = (req, res, next) => {
    const errors = [];
    
    // Validate Ethereum addresses if present
    const addressFields = ['rollupContract', 'bridgeContract', 'inboxContract', 
                          'sequencerInboxContract', 'outboxContract', 'challengeManagerContract', 
                          'validatorWalletCreatorContract', 'stakeToken'];
    
    for (const field of addressFields) {
        const value = req.body[field];
        if (value && !isValidEthereumAddress(value)) {
            errors.push(`Invalid Ethereum address format for ${field}: ${value}`);
        }
    }
    
    // Validate chain ID
    if (req.body.parentChainId !== undefined) {
        const chainId = parseInt(req.body.parentChainId);
        if (isNaN(chainId) || chainId < 1 || chainId > 2147483647) {
            errors.push('Invalid parent chain ID. Must be a positive integer.');
        }
    }
    
    // Validate confirmation period
    if (req.body.confirmationPeriodBlocks !== undefined) {
        const period = parseInt(req.body.confirmationPeriodBlocks);
        if (isNaN(period) || period < 1 || period > 1000000) {
            errors.push('Invalid confirmation period. Must be between 1 and 1,000,000 blocks.');
        }
    }
    
    // Validate base stake
    if (req.body.baseStake !== undefined) {
        try {
            const stake = BigInt(req.body.baseStake);
            if (stake < 0n) {
                errors.push('Base stake must be non-negative');
            }
        } catch (error) {
            errors.push('Invalid base stake format. Must be a valid number string.');
        }
    }
    
    // Validate chain type
    if (req.body.chainType && !['Rollup', 'AnyTrust'].includes(req.body.chainType)) {
        errors.push('Chain type must be either "Rollup" or "AnyTrust"');
    }
    
    // Check for potential injection attempts
    const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /onload=/i,
        /onerror=/i,
        /'[\s]*OR[\s]*'/i,
        /"[\s]*OR[\s]*"/i,
        /UNION[\s]+SELECT/i,
        /DROP[\s]+TABLE/i
    ];
    
    const checkString = JSON.stringify(req.body);
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(checkString)) {
            logger.warn('Suspicious input detected in orbit request', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                endpoint: req.path,
                workspaceId: req.workspace?.id || 'unknown',
                pattern: pattern.source
            });
            errors.push('Invalid input detected');
            break;
        }
    }
    
    if (errors.length > 0) {
        logger.warn('Orbit input validation failed', {
            ip: req.ip,
            endpoint: req.path,
            workspaceId: req.workspace?.id || 'unknown',
            errors
        });
        
        return res.status(400).json({
            error: 'Input validation failed',
            details: errors
        });
    }
    
    next();
};

/**
 * Validate Ethereum address format
 */
function isValidEthereumAddress(address) {
    if (typeof address !== 'string') return false;
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return false;
    return true;
}

/**
 * Security headers middleware for orbit endpoints
 */
const orbitSecurityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy for API responses
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
    
    next();
};

/**
 * Request logging middleware for orbit endpoints
 */
const orbitRequestLogger = (req, res, next) => {
    const startTime = Date.now();
    
    // Log request
    logger.info('Orbit API request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        workspaceId: req.workspace?.id || 'unknown',
        timestamp: new Date().toISOString()
    });
    
    // Log response
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;
        
        logger.info('Orbit API response', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            workspaceId: req.workspace?.id || 'unknown',
            responseSize: data ? data.length : 0
        });
        
        return originalSend.call(this, data);
    };
    
    next();
};

module.exports = {
    orbitApiLimiter,
    orbitExpensiveLimiter,
    orbitSpeedLimiter,
    orbitContractValidationLimiter,
    orbitInputValidation,
    orbitSecurityHeaders,
    orbitRequestLogger
};