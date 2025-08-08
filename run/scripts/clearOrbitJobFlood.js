const { getOrbitBatchQueueManager, clearWorkspaceRateLimit, getQueueStatistics } = require('../lib/orbitBatchQueue');
const { OrbitChainConfig } = require('../models');
const logger = require('../lib/logger');

/**
 * Emergency script to clear orbit job queue floods and reset rate limiting
 * Usage: node run/scripts/clearOrbitJobFlood.js [workspaceId]
 */
async function clearOrbitJobFlood() {
    const args = process.argv.slice(2);
    const targetWorkspaceId = args[0];

    try {
        logger.info('Starting orbit job flood cleanup');

        // Get current queue statistics
        const initialStats = getQueueStatistics();
        console.log('\n📊 Current Queue Statistics:');
        console.log(`  Recent Jobs: ${initialStats.recentJobs}`);
        console.log(`  Active Discovery Jobs: ${initialStats.activeDiscoveryJobs}`);
        console.log(`  Total Tracked Workspaces: ${initialStats.totalTrackedWorkspaces}`);

        if (targetWorkspaceId) {
            // Clear rate limiting for specific workspace
            console.log(`\n🎯 Clearing rate limiting for workspace: ${targetWorkspaceId}`);
            
            const clearedCount = clearWorkspaceRateLimit(parseInt(targetWorkspaceId));
            console.log(`✅ Cleared ${clearedCount} rate limiting entries for workspace ${targetWorkspaceId}`);
            
        } else {
            // Clear rate limiting for all orbit workspaces
            console.log('\n🧹 Clearing rate limiting for all orbit workspaces...');
            
            const orbitWorkspaces = await OrbitChainConfig.findAll({
                attributes: ['workspaceId'],
                include: [{
                    model: require('../models').Workspace,
                    as: 'workspace',
                    attributes: ['id', 'name'],
                    required: true
                }]
            });

            let totalCleared = 0;
            for (const config of orbitWorkspaces) {
                const clearedCount = clearWorkspaceRateLimit(config.workspaceId);
                totalCleared += clearedCount;
                
                if (clearedCount > 0) {
                    console.log(`  ✅ Workspace ${config.workspaceId} (${config.workspace.name}): cleared ${clearedCount} entries`);
                }
            }

            console.log(`\n🎉 Total cleared: ${totalCleared} rate limiting entries across ${orbitWorkspaces.length} workspaces`);
        }

        // Show updated statistics
        const finalStats = getQueueStatistics();
        console.log('\n📊 Updated Queue Statistics:');
        console.log(`  Recent Jobs: ${finalStats.recentJobs} (was ${initialStats.recentJobs})`);
        console.log(`  Active Discovery Jobs: ${finalStats.activeDiscoveryJobs} (was ${initialStats.activeDiscoveryJobs})`);
        console.log(`  Total Tracked Workspaces: ${finalStats.totalTrackedWorkspaces} (was ${initialStats.totalTrackedWorkspaces})`);

        console.log('\n✅ Orbit job flood cleanup completed!');
        console.log('\n💡 Recommendations:');
        console.log('  1. Monitor job queue for the next few minutes');
        console.log('  2. Check that new jobs are being enqueued at a reasonable rate');
        console.log('  3. If flood continues, check for bugs in job enqueueing logic');
        console.log('  4. Consider adjusting ORBIT_BATCH_DISCOVERY_INTERVAL and ORBIT_BATCH_MONITORING_INTERVAL');

    } catch (error) {
        logger.error('Error in orbit job flood cleanup', {
            error: error.message,
            errorStack: error.stack
        });

        console.log('\n❌ Orbit job flood cleanup failed!');
        console.log(`Error: ${error.message}`);
    }
}

// Helper function to display current job counts (requires queue system integration)
async function displayJobCounts() {
    try {
        console.log('\n📋 Current Job Queue Status:');
        console.log('  (Note: This requires integration with your specific queue system)');
        console.log('  - Check your queue dashboard or monitoring system');
        console.log('  - Look for jobs named: discoverOrbitBatches-*, monitorOrbitBatches-*');
        
    } catch (error) {
        console.log('Could not fetch job queue status:', error.message);
    }
}

// Helper function to simulate queue drain monitoring
function startQueueMonitoring(durationMs = 300000) { // 5 minutes
    console.log(`\n👁️  Starting queue monitoring for ${durationMs / 1000} seconds...`);
    
    const startTime = Date.now();
    const monitorInterval = setInterval(() => {
        const stats = getQueueStatistics();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        
        console.log(`  [${elapsed}s] Recent Jobs: ${stats.recentJobs}, Active Discovery: ${stats.activeDiscoveryJobs}`);
        
        if (Date.now() - startTime >= durationMs) {
            clearInterval(monitorInterval);
            console.log('\n✅ Queue monitoring completed');
        }
    }, 10000); // Every 10 seconds
    
    return monitorInterval;
}

// Main execution
if (require.main === module) {
    (async () => {
        console.log('🚨 Orbit Job Queue Flood Cleanup Tool\n');
        
        await displayJobCounts();
        await clearOrbitJobFlood();
        
        // Optionally start monitoring
        const shouldMonitor = process.argv.includes('--monitor');
        if (shouldMonitor) {
            startQueueMonitoring();
        } else {
            console.log('\n💡 Use --monitor flag to watch queue drain in real-time');
            process.exit(0);
        }
        
    })().catch(error => {
        console.error('Cleanup script failed:', error);
        process.exit(1);
    });
}

module.exports = {
    clearOrbitJobFlood,
    displayJobCounts,
    startQueueMonitoring
};