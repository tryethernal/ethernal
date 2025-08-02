const { getOrbitConfig } = require('./orbitConfig');
const logger = require('./logger');

/**
 * Circuit Breaker implementation for RPC calls
 */
class CircuitBreaker {
    constructor(name, config) {
        this.name = name;
        this.failureThreshold = config.failureThreshold;
        this.resetTimeout = config.resetTimeout;
        this.monitorTimeout = config.monitorTimeout;
        
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.nextAttempt = Date.now();
        this.successCount = 0;
    }
    
    async execute(operation) {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                throw new Error(`Circuit breaker ${this.name} is OPEN`);
            }
            this.state = 'HALF_OPEN';
            this.successCount = 0;
        }
        
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
    
    onSuccess() {
        this.failureCount = 0;
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= 3) { // Require 3 successes to close
                this.state = 'CLOSED';
                logger.info(`Circuit breaker ${this.name} closed after successful operations`);
            }
        }
    }
    
    onFailure() {
        this.failureCount++;
        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.resetTimeout;
            logger.warn(`Circuit breaker ${this.name} opened after ${this.failureCount} failures`);
        }
    }
    
    getState() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            nextAttempt: this.nextAttempt,
            successCount: this.successCount
        };
    }
}

/**
 * Rate limiter implementation
 */
class RateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }
    
    async waitForSlot() {
        const now = Date.now();
        
        // Remove old requests outside the window
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        
        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = Math.min(...this.requests);
            const waitTime = this.windowMs - (now - oldestRequest);
            
            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return this.waitForSlot(); // Recursive check after waiting
            }
        }
        
        this.requests.push(now);
    }
}

/**
 * Retry utility with exponential backoff
 */
class RetryUtil {
    constructor(config) {
        this.attempts = config.attempts;
        this.delay = config.delay;
        this.maxDelay = config.maxDelay;
        this.backoff = config.backoff || 'exponential';
    }
    
    async execute(operation, context = {}) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.attempts; attempt++) {
            try {
                logger.debug(`Retry attempt ${attempt}/${this.attempts}`, context);
                return await operation();
            } catch (error) {
                lastError = error;
                
                // Don't retry on certain errors
                if (this.isNonRetryableError(error)) {
                    logger.warn(`Non-retryable error encountered: ${error.message}`, context);
                    throw error;
                }
                
                if (attempt === this.attempts) {
                    logger.error(`All ${this.attempts} retry attempts failed`, { ...context, error: error.message });
                    break;
                }
                
                const delayMs = this.calculateDelay(attempt);
                logger.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms: ${error.message}`, context);
                
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        
        throw lastError;
    }
    
    calculateDelay(attempt) {
        if (this.backoff === 'exponential') {
            const delay = this.delay * Math.pow(2, attempt - 1);
            return Math.min(delay, this.maxDelay);
        }
        return this.delay;
    }
    
    isNonRetryableError(error) {
        // Don't retry on these error types
        const nonRetryablePatterns = [
            /invalid address/i,
            /invalid abi/i,
            /unauthorized/i,
            /forbidden/i,
            /not found/i,
            /bad request/i,
            /contract not deployed/i,
            /insufficient funds/i
        ];
        
        return nonRetryablePatterns.some(pattern => pattern.test(error.message));
    }
}

/**
 * Production-grade RPC client with retries, circuit breaker, and rate limiting
 */
class ProductionRpcClient {
    constructor(provider, contractAddress, abi, name) {
        this.provider = provider;
        this.contractAddress = contractAddress;
        this.abi = abi;
        this.name = name;
        
        const config = getOrbitConfig();
        
        // Initialize components
        this.circuitBreaker = new CircuitBreaker(name, config.getCircuitBreakerConfig());
        this.rateLimiter = new RateLimiter(
            config.RATE_LIMIT_RPC_MAX_REQUESTS, 
            config.RATE_LIMIT_RPC_WINDOW
        );
        this.retryUtil = new RetryUtil(config.getRetryConfig());
        
        // Create contract instance
        this.contract = new (require('ethers')).Contract(contractAddress, abi, provider);
        
        // Metrics
        this.metrics = {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            circuitBreakerTrips: 0,
            rateLimitHits: 0
        };
    }
    
    async call(methodName, ...args) {
        const context = {
            contract: this.contractAddress,
            method: methodName,
            args: args.length
        };
        
        this.metrics.totalCalls++;
        
        try {
            // Rate limiting
            await this.rateLimiter.waitForSlot();
            
            // Circuit breaker + retry
            const result = await this.circuitBreaker.execute(async () => {
                return await this.retryUtil.execute(async () => {
                    const startTime = Date.now();
                    
                    try {
                        const result = await this.contract[methodName](...args);
                        const duration = Date.now() - startTime;
                        
                        logger.debug(`RPC call successful: ${methodName}`, {
                            ...context,
                            duration,
                            result: typeof result
                        });
                        
                        return result;
                    } catch (error) {
                        const duration = Date.now() - startTime;
                        logger.warn(`RPC call failed: ${methodName}`, {
                            ...context,
                            duration,
                            error: error.message
                        });
                        throw error;
                    }
                }, context);
            });
            
            this.metrics.successfulCalls++;
            return result;
            
        } catch (error) {
            this.metrics.failedCalls++;
            
            if (error.message.includes('Circuit breaker')) {
                this.metrics.circuitBreakerTrips++;
            }
            
            logger.error(`Production RPC call failed for ${this.name}.${methodName}`, {
                ...context,
                error: error.message,
                circuitBreakerState: this.circuitBreaker.getState()
            });
            
            throw error;
        }
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            circuitBreakerState: this.circuitBreaker.getState(),
            successRate: this.metrics.totalCalls > 0 ? 
                (this.metrics.successfulCalls / this.metrics.totalCalls * 100).toFixed(2) + '%' : 
                'N/A'
        };
    }
    
    async healthCheck() {
        try {
            // Try a simple read operation to check connectivity
            const code = await this.provider.getCode(this.contractAddress);
            return {
                healthy: code !== '0x',
                contractDeployed: code !== '0x',
                circuitBreakerState: this.circuitBreaker.state,
                metrics: this.getMetrics()
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                circuitBreakerState: this.circuitBreaker.state,
                metrics: this.getMetrics()
            };
        }
    }
}

/**
 * Batch data parser with production safeguards
 */
class BatchDataParser {
    constructor() {
        this.config = getOrbitConfig();
    }
    
    async parseBatchData(batchData, targetTransactionHash) {
        const startTime = Date.now();
        
        try {
            // Size check
            if (batchData.length > this.config.MAX_BATCH_DATA_SIZE) {
                throw new Error(`Batch data too large: ${batchData.length} bytes > ${this.config.MAX_BATCH_DATA_SIZE} limit`);
            }
            
            // Parse batch data (simplified - real implementation would depend on Arbitrum batch format)
            const transactions = await this.extractTransactionsFromBatch(batchData);
            const isIncluded = transactions.some(tx => tx.hash === targetTransactionHash);
            
            const duration = Date.now() - startTime;
            logger.debug('Batch data parsed successfully', {
                batchSize: batchData.length,
                transactionCount: transactions.length,
                targetFound: isIncluded,
                duration
            });
            
            return {
                isIncluded,
                transactionCount: transactions.length,
                batchSize: batchData.length,
                parseDuration: duration
            };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Batch data parsing failed', {
                batchSize: batchData?.length || 0,
                duration,
                error: error.message
            });
            throw error;
        }
    }
    
    async extractTransactionsFromBatch(batchData) {
        // This is a simplified implementation
        // Real implementation would need to decode Arbitrum's batch format
        // which includes compressed transaction data
        
        try {
            // For now, return empty array - this needs real implementation
            // based on Arbitrum's batch encoding specification
            logger.warn('Batch data parsing not fully implemented - using placeholder');
            return [];
        } catch (error) {
            logger.error('Failed to extract transactions from batch data', {
                error: error.message,
                batchSize: batchData.length
            });
            throw new Error(`Batch parsing failed: ${error.message}`);
        }
    }
}

module.exports = {
    CircuitBreaker,
    RateLimiter,
    RetryUtil,
    ProductionRpcClient,
    BatchDataParser
};