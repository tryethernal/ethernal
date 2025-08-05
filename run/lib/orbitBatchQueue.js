const { enqueue } = require('./queue');
const logger = require('./logger');
const { getOrbitConfig } = require('./orbitConfig');

/**
 * Manages orbit batch discovery job queuing with deduplication and rate limiting
 */
class OrbitBatchQueueManager {
    constructor() {
        this.config = getOrbitConfig();
        
        // Track recent job submissions per workspace
        this.recentJobs = new Map(); // workspaceId -> { lastEnqueued, jobId, type }
        
        // Track active discovery jobs per workspace
        this.activeJobs = new Set(); // Set of workspaceId strings
        
        // Cleanup interval for old entries
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    /**
     * Enqueue a batch discovery job with deduplication
     */
    async enqueueBatchDiscovery(workspaceId, options = {}) {
        const {
            priority = 3,
            reason = 'scheduled',
            maxAge = 120000, // 2 minutes default cooldown
            force = false
        } = options;

        const jobContext = {
            method: 'enqueueBatchDiscovery',
            workspaceId,
            reason,
            priority
        };

        try {
            // Check if we should skip this job
            if (!force && this.shouldSkipJob(workspaceId, reason, maxAge)) {
                logger.debug('Skipping batch discovery job due to rate limiting', {
                    ...jobContext,
                    skipReason: this.getSkipReason(workspaceId, reason, maxAge)
                });
                return { skipped: true, reason: 'rate_limited' };
            }

            // Generate unique job ID
            const jobId = `discoverOrbitBatches-${workspaceId}-${reason}-${Date.now()}`;
            
            logger.debug('Enqueuing batch discovery job', {
                ...jobContext,
                jobId
            });

            // Enqueue the job
            await enqueue(
                'discoverOrbitBatches',
                jobId,
                { workspaceId },
                priority
            );

            // Track this job
            this.trackJob(workspaceId, jobId, reason);

            logger.info('Successfully enqueued batch discovery job', {
                ...jobContext,
                jobId
            });

            return { enqueued: true, jobId };

        } catch (error) {
            logger.error('Failed to enqueue batch discovery job', {
                ...jobContext,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Enqueue a batch monitoring job with deduplication
     */
    async enqueueBatchMonitoring(workspaceId, options = {}) {
        const {
            priority = 5,
            reason = 'scheduled',
            maxAge = 300000, // 5 minutes default cooldown
            force = false
        } = options;

        const jobContext = {
            method: 'enqueueBatchMonitoring',
            workspaceId,
            reason,
            priority
        };

        try {
            // Check if we should skip this job
            if (!force && this.shouldSkipJob(workspaceId, `monitor-${reason}`, maxAge)) {
                logger.debug('Skipping batch monitoring job due to rate limiting', {
                    ...jobContext,
                    skipReason: this.getSkipReason(workspaceId, `monitor-${reason}`, maxAge)
                });
                return { skipped: true, reason: 'rate_limited' };
            }

            // Generate unique job ID
            const jobId = `monitorOrbitBatches-${workspaceId}-${reason}-${Date.now()}`;
            
            logger.debug('Enqueuing batch monitoring job', {
                ...jobContext,
                jobId
            });

            // Enqueue the job
            await enqueue(
                'monitorOrbitBatches',
                jobId,
                { workspaceId },
                priority
            );

            // Track this job
            this.trackJob(workspaceId, jobId, `monitor-${reason}`);

            logger.info('Successfully enqueued batch monitoring job', {
                ...jobContext,
                jobId
            });

            return { enqueued: true, jobId };

        } catch (error) {
            logger.error('Failed to enqueue batch monitoring job', {
                ...jobContext,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Check if a job should be skipped due to rate limiting
     */
    shouldSkipJob(workspaceId, reason, maxAge) {
        const key = `${workspaceId}-${reason}`;
        const recentJob = this.recentJobs.get(key);
        
        if (!recentJob) {
            return false; // No recent job, proceed
        }

        const timeSinceLastJob = Date.now() - recentJob.lastEnqueued;
        return timeSinceLastJob < maxAge;
    }

    /**
     * Get the reason why a job would be skipped
     */
    getSkipReason(workspaceId, reason, maxAge) {
        const key = `${workspaceId}-${reason}`;
        const recentJob = this.recentJobs.get(key);
        
        if (!recentJob) {
            return 'no_recent_job';
        }

        const timeSinceLastJob = Date.now() - recentJob.lastEnqueued;
        const cooldownRemaining = maxAge - timeSinceLastJob;
        
        return `cooldown_active_${Math.ceil(cooldownRemaining / 1000)}s_remaining`;
    }

    /**
     * Track a job submission
     */
    trackJob(workspaceId, jobId, reason) {
        const key = `${workspaceId}-${reason}`;
        
        this.recentJobs.set(key, {
            lastEnqueued: Date.now(),
            jobId,
            type: reason
        });

        // Also track active discovery jobs
        if (reason.includes('discover') || !reason.includes('monitor')) {
            this.activeJobs.add(workspaceId);
        }
    }

    /**
     * Mark a job as completed (call this from job completion)
     */
    markJobCompleted(workspaceId, jobId) {
        logger.debug('Marking job as completed', { workspaceId, jobId });
        
        // Remove from active jobs
        this.activeJobs.delete(workspaceId);
        
        // Clean up recent job tracking for this specific job
        for (const [key, jobInfo] of this.recentJobs.entries()) {
            if (jobInfo.jobId === jobId) {
                // Don't remove immediately, keep for rate limiting
                logger.debug('Job completion tracked', { workspaceId, jobId, key });
                break;
            }
        }
    }

    /**
     * Check if a workspace has active discovery jobs
     */
    hasActiveDiscoveryJob(workspaceId) {
        return this.activeJobs.has(workspaceId);
    }

    /**
     * Get statistics about job queuing
     */
    getStatistics() {
        const now = Date.now();
        const recentJobCount = Array.from(this.recentJobs.values()).filter(
            job => now - job.lastEnqueued < 300000 // Last 5 minutes
        ).length;

        return {
            recentJobs: recentJobCount,
            activeDiscoveryJobs: this.activeJobs.size,
            totalTrackedWorkspaces: this.recentJobs.size
        };
    }

    /**
     * Clean up old entries
     */
    cleanup() {
        const now = Date.now();
        const maxAge = 30 * 60 * 1000; // 30 minutes
        
        let cleaned = 0;
        for (const [key, jobInfo] of this.recentJobs.entries()) {
            if (now - jobInfo.lastEnqueued > maxAge) {
                this.recentJobs.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug('Cleaned up old job tracking entries', { cleaned });
        }
    }

    /**
     * Force clear all rate limiting for a workspace (emergency use)
     */
    clearWorkspaceRateLimit(workspaceId) {
        const cleared = [];
        
        for (const [key, jobInfo] of this.recentJobs.entries()) {
            if (key.startsWith(`${workspaceId}-`)) {
                this.recentJobs.delete(key);
                cleared.push(key);
            }
        }

        this.activeJobs.delete(workspaceId);

        logger.info('Cleared rate limiting for workspace', { workspaceId, clearedKeys: cleared });
        return cleared.length;
    }

    /**
     * Destroy the manager and clean up resources
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        this.recentJobs.clear();
        this.activeJobs.clear();
    }
}

// Singleton instance
let queueManager = null;

/**
 * Get the singleton queue manager instance
 */
function getOrbitBatchQueueManager() {
    if (!queueManager) {
        queueManager = new OrbitBatchQueueManager();
    }
    return queueManager;
}

/**
 * Helper functions for easy access
 */
async function enqueueBatchDiscovery(workspaceId, options = {}) {
    return getOrbitBatchQueueManager().enqueueBatchDiscovery(workspaceId, options);
}

async function enqueueBatchMonitoring(workspaceId, options = {}) {
    return getOrbitBatchQueueManager().enqueueBatchMonitoring(workspaceId, options);
}

function markJobCompleted(workspaceId, jobId) {
    return getOrbitBatchQueueManager().markJobCompleted(workspaceId, jobId);
}

function hasActiveDiscoveryJob(workspaceId) {
    return getOrbitBatchQueueManager().hasActiveDiscoveryJob(workspaceId);
}

function getQueueStatistics() {
    return getOrbitBatchQueueManager().getStatistics();
}

function clearWorkspaceRateLimit(workspaceId) {
    return getOrbitBatchQueueManager().clearWorkspaceRateLimit(workspaceId);
}

module.exports = {
    OrbitBatchQueueManager,
    getOrbitBatchQueueManager,
    enqueueBatchDiscovery,
    enqueueBatchMonitoring,
    markJobCompleted,
    hasActiveDiscoveryJob,
    getQueueStatistics,
    clearWorkspaceRateLimit
};