const { isMarketingEnabled } = require('../lib/flags');
const Analytics = require('../lib/analytics');
const db = require('../lib/firebase');

module.exports = async job => {
    const data = job.data;
    if (!data.workspaceId)
        throw new Error('Missing parameter.');

    if (!isMarketingEnabled())
        return 'Marketing is not enabled';

    const workspace = await db.getWorkspaceById(data.workspaceId);

    const analytics = new Analytics();
    analytics.track({
        distinctId: workspace.userId,
        event: 'workspace:created'
    })

    return true;
};
