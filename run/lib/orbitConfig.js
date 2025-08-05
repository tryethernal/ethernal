const { getEnv } = require('./env');

/**
 * Production configuration for Orbit chain processing
 */
class OrbitConfig {
    constructor() {
        // RPC Configuration
        this.RPC_TIMEOUT = parseInt(getEnv('ORBIT_RPC_TIMEOUT', '30000'));
        this.RPC_RETRY_ATTEMPTS = parseInt(getEnv('ORBIT_RPC_RETRY_ATTEMPTS', '3'));
        this.RPC_RETRY_DELAY = parseInt(getEnv('ORBIT_RPC_RETRY_DELAY', '1000'));
        this.RPC_MAX_CONCURRENT = parseInt(getEnv('ORBIT_RPC_MAX_CONCURRENT', '10'));
        
        // Block Range Limits (to avoid RPC provider errors)
        this.MAX_BLOCK_RANGE_PER_QUERY = parseInt(getEnv('ORBIT_MAX_BLOCK_RANGE_PER_QUERY', '500')); // Alchemy/Infura limit
        this.MAX_BLOCKS_TO_SEARCH = parseInt(getEnv('ORBIT_MAX_BLOCKS_TO_SEARCH', '10000')); // Don't search too far back
        this.BLOCK_RANGE_CHUNK_SIZE = parseInt(getEnv('ORBIT_BLOCK_RANGE_CHUNK_SIZE', '500'));
        
        // Job Configuration
        this.JOB_BATCH_SIZE = parseInt(getEnv('ORBIT_JOB_BATCH_SIZE', '100'));
        this.JOB_RETRY_ATTEMPTS = parseInt(getEnv('ORBIT_JOB_RETRY_ATTEMPTS', '5'));
        this.JOB_RETRY_DELAY = parseInt(getEnv('ORBIT_JOB_RETRY_DELAY', '5000'));
        this.JOB_PROCESSING_TIMEOUT = parseInt(getEnv('ORBIT_JOB_PROCESSING_TIMEOUT', '300000')); // 5 minutes
        
        // Batch Monitoring Configuration
        this.BATCH_MONITOR_LIMIT = parseInt(getEnv('ORBIT_BATCH_MONITOR_LIMIT', '100'));
        this.BATCH_MONITOR_INTERVAL = parseInt(getEnv('ORBIT_BATCH_MONITOR_INTERVAL', '300000')); // 5 minutes
        
        // Batch Discovery Configuration
        this.BATCH_DISCOVERY_INTERVAL = parseInt(getEnv('ORBIT_BATCH_DISCOVERY_INTERVAL', '120000')); // 2 minutes
        this.BATCH_DISCOVERY_LIMIT = parseInt(getEnv('ORBIT_BATCH_DISCOVERY_LIMIT', '1000')); // Max batches to discover per run
        this.ENABLE_BATCH_DATA_PARSING = getEnv('ORBIT_ENABLE_BATCH_DATA_PARSING', 'true') === 'true';
        this.BATCH_PARSING_TIMEOUT = parseInt(getEnv('ORBIT_BATCH_PARSING_TIMEOUT', '30000')); // 30 seconds
        
        // State Progression Configuration
        this.SEQUENCING_TIMEOUT = parseInt(getEnv('ORBIT_SEQUENCING_TIMEOUT', '600000')); // 10 minutes
        this.POSTING_TIMEOUT = parseInt(getEnv('ORBIT_POSTING_TIMEOUT', '3600000')); // 1 hour
        this.CONFIRMATION_TIMEOUT = parseInt(getEnv('ORBIT_CONFIRMATION_TIMEOUT', '604800000')); // 7 days
        this.FINALIZATION_TIMEOUT = parseInt(getEnv('ORBIT_FINALIZATION_TIMEOUT', '604800000')); // 7 days
        
        // Monitoring and Polling
        this.POLLING_INTERVAL = parseInt(getEnv('ORBIT_POLLING_INTERVAL', '30000')); // 30 seconds
        this.HEALTH_CHECK_INTERVAL = parseInt(getEnv('ORBIT_HEALTH_CHECK_INTERVAL', '60000')); // 1 minute
        this.METRICS_COLLECTION_INTERVAL = parseInt(getEnv('ORBIT_METRICS_INTERVAL', '300000')); // 5 minutes
        
        // Cache Configuration
        this.CACHE_TTL = parseInt(getEnv('ORBIT_CACHE_TTL', '300')); // 5 minutes
        this.BATCH_DATA_CACHE_TTL = parseInt(getEnv('ORBIT_BATCH_DATA_CACHE_TTL', '3600')); // 1 hour
        
        // Rate Limiting
        this.RATE_LIMIT_WINDOW = parseInt(getEnv('ORBIT_RATE_LIMIT_WINDOW', '60000')); // 1 minute
        this.RATE_LIMIT_MAX_REQUESTS = parseInt(getEnv('ORBIT_RATE_LIMIT_MAX_REQUESTS', '100'));
        this.RATE_LIMIT_RPC_WINDOW = parseInt(getEnv('ORBIT_RATE_LIMIT_RPC_WINDOW', '1000')); // 1 second
        this.RATE_LIMIT_RPC_MAX_REQUESTS = parseInt(getEnv('ORBIT_RATE_LIMIT_RPC_MAX_REQUESTS', '10'));
        
        // Circuit Breaker Configuration
        this.CIRCUIT_BREAKER_FAILURE_THRESHOLD = parseInt(getEnv('ORBIT_CIRCUIT_BREAKER_FAILURE_THRESHOLD', '5'));
        this.CIRCUIT_BREAKER_RESET_TIMEOUT = parseInt(getEnv('ORBIT_CIRCUIT_BREAKER_RESET_TIMEOUT', '60000')); // 1 minute
        this.CIRCUIT_BREAKER_MONITOR_TIMEOUT = parseInt(getEnv('ORBIT_CIRCUIT_BREAKER_MONITOR_TIMEOUT', '30000')); // 30 seconds
        
        // Logging and Monitoring
        this.LOG_LEVEL = getEnv('ORBIT_LOG_LEVEL', 'info');
        this.ENABLE_DETAILED_LOGGING = getEnv('ORBIT_ENABLE_DETAILED_LOGGING', 'false') === 'true';
        this.ENABLE_METRICS = getEnv('ORBIT_ENABLE_METRICS', 'true') === 'true';
        
        // Data Retention
        this.DATA_RETENTION_DAYS = parseInt(getEnv('ORBIT_DATA_RETENTION_DAYS', '90'));
        this.ARCHIVE_AFTER_DAYS = parseInt(getEnv('ORBIT_ARCHIVE_AFTER_DAYS', '30'));
        
        // Security
        this.MAX_CONTRACT_CALLS_PER_MINUTE = parseInt(getEnv('ORBIT_MAX_CONTRACT_CALLS_PER_MINUTE', '60'));
        this.REQUIRE_CONTRACT_VALIDATION = getEnv('ORBIT_REQUIRE_CONTRACT_VALIDATION', 'true') === 'true';
        this.MAX_BATCH_DATA_SIZE = parseInt(getEnv('ORBIT_MAX_BATCH_DATA_SIZE', '1048576')); // 1MB
        
        // Feature Flags
        this.ENABLE_BATCH_DATA_PARSING = getEnv('ORBIT_ENABLE_BATCH_DATA_PARSING', 'true') === 'true';
        this.ENABLE_REAL_TIME_MONITORING = getEnv('ORBIT_ENABLE_REAL_TIME_MONITORING', 'true') === 'true';
        this.ENABLE_AUTOMATIC_RECOVERY = getEnv('ORBIT_ENABLE_AUTOMATIC_RECOVERY', 'true') === 'true';
        
        this.validate();
    }
    
    validate() {
        // Validate critical configuration values
        if (this.RPC_TIMEOUT < 1000) {
            throw new Error('ORBIT_RPC_TIMEOUT must be at least 1000ms');
        }
        
        if (this.JOB_RETRY_ATTEMPTS < 1) {
            throw new Error('ORBIT_JOB_RETRY_ATTEMPTS must be at least 1');
        }
        
        if (this.RATE_LIMIT_MAX_REQUESTS < 1) {
            throw new Error('ORBIT_RATE_LIMIT_MAX_REQUESTS must be at least 1');
        }
        
        if (this.DATA_RETENTION_DAYS < 1) {
            throw new Error('ORBIT_DATA_RETENTION_DAYS must be at least 1');
        }
    }
    
    getRetryConfig() {
        return {
            attempts: this.RPC_RETRY_ATTEMPTS,
            delay: this.RPC_RETRY_DELAY,
            maxDelay: this.RPC_RETRY_DELAY * 10,
            backoff: 'exponential'
        };
    }
    
    getCircuitBreakerConfig() {
        return {
            failureThreshold: this.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
            resetTimeout: this.CIRCUIT_BREAKER_RESET_TIMEOUT,
            monitorTimeout: this.CIRCUIT_BREAKER_MONITOR_TIMEOUT
        };
    }
    
    getRateLimitConfig() {
        return {
            window: this.RATE_LIMIT_WINDOW,
            maxRequests: this.RATE_LIMIT_MAX_REQUESTS,
            rpcWindow: this.RATE_LIMIT_RPC_WINDOW,
            rpcMaxRequests: this.RATE_LIMIT_RPC_MAX_REQUESTS
        };
    }
}

// Singleton instance
let orbitConfigInstance = null;

function getOrbitConfig() {
    if (!orbitConfigInstance) {
        orbitConfigInstance = new OrbitConfig();
    }
    return orbitConfigInstance;
}

module.exports = {
    OrbitConfig,
    getOrbitConfig
};