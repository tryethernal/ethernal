/**
 * @fileoverview Shared helper functions for the Sentry Dashboard.
 * @module lib/helpers
 */

/**
 * Map a pipeline run status to a Vuetify color.
 *
 * @param {string} status - Pipeline run status
 * @returns {string} Vuetify color name
 */
export function statusColor(status) {
    const colors = {
        discovered: 'blue', triaging: 'orange', fixing: 'purple',
        reviewing: 'cyan', merging: 'teal', merged: 'indigo',
        deploying: 'lime', completed: 'green', closed: 'grey',
        escalated: 'amber', failed: 'red'
    };
    return colors[status] || 'grey';
}

/**
 * Convert a date string to a human-readable "time ago" format.
 *
 * @param {string} dateStr - ISO date string
 * @returns {string} Human-readable time ago string
 */
export function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}
