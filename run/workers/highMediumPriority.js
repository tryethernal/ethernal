/**
 * @fileoverview Combined high+medium worker entry point.
 * Kept for backward compatibility with existing PM2/Docker configs.
 * For better isolation, use highPriority.js and mediumPriority.js separately.
 * @module workers/highMediumPriority
 */

require('./highPriority');
require('./mediumPriority');
