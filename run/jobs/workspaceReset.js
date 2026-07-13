/**
 * @fileoverview Workspace reset job.
 * Deletes blocks and contracts within a date range for data retention.
 * @module jobs/workspaceReset
 */

const Sequelize = require('sequelize');
const { Workspace } = require('../models');
const { bulkEnqueue } = require('../lib/queue');
const { getMaxBlockForSyncReset, getMaxContractForReset, getWorkspaceResetPageSize } = require('../lib/env');
const Op = Sequelize.Op;

/**
 * Enqueues batch-delete jobs for a set of ids, chunked by the given size.
 *
 * @param {string} queueName - Target queue ('batchBlockDelete' or 'batchContractDelete')
 * @param {number} workspaceId - Workspace whose records are being deleted
 * @param {number[]} ids - Record ids to schedule for deletion
 * @param {number} chunkSize - Maximum number of ids per enqueued job
 * @param {function(number, number): string} nameFn - Builds a job name from (startOffset, endOffset)
 * @param {number} baseOffset - Running offset used to keep job names unique across pages
 * @returns {Promise<void>}
 */
const enqueueBatchDeletes = async (queueName, workspaceId, ids, chunkSize, nameFn, baseOffset) => {
    const jobs = [];
    for (let i = 0; i < ids.length; i += chunkSize)
        jobs.push({
            name: nameFn(baseOffset + i, baseOffset + i + chunkSize),
            data: {
                workspaceId,
                ids: ids.slice(i, i + chunkSize)
            }
        });

    if (jobs.length)
        await bulkEnqueue(queueName, jobs);
};

/**
 * Walks a workspace association in keyset-paginated pages ordered by indexed
 * primary key, enqueuing batch-delete jobs for records whose createdAt falls
 * within [from, to]. Avoids the unindexed createdAt full scan (and the tight
 * job timeout it triggered) by keeping each query indexed and bounded.
 *
 * @param {Object} getter - Sequelize association getter (e.g. workspace.getBlocks)
 * @param {number} workspaceId - Workspace being reset
 * @param {Date|string|number} from - Inclusive start of the retention window
 * @param {Date|string|number} to - Inclusive end of the retention window
 * @param {string} queueName - Target delete queue name
 * @param {number} chunkSize - Ids per enqueued delete job
 * @param {function(number, number): string} nameFn - Builds a job name from (startOffset, endOffset)
 * @returns {Promise<void>}
 */
const paginateAndEnqueue = async (getter, workspaceId, from, to, queueName, chunkSize, nameFn) => {
    const pageSize = getWorkspaceResetPageSize();
    const fromTime = new Date(from).getTime();
    const toTime = new Date(to).getTime();
    let lastId = 0;
    let offset = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const page = await getter({
            where: { id: { [Op.gt]: lastId } },
            attributes: ['id', 'createdAt'],
            order: [['id', 'ASC']],
            limit: pageSize
        });

        if (!page.length)
            break;

        lastId = page[page.length - 1].id;

        const matchingIds = page
            .filter(r => {
                const t = new Date(r.createdAt).getTime();
                return t >= fromTime && t <= toTime;
            })
            .map(r => r.id);

        if (matchingIds.length) {
            await enqueueBatchDeletes(queueName, workspaceId, matchingIds, chunkSize, nameFn, offset);
            offset += matchingIds.length;
        }

        if (page.length < pageSize)
            break;
    }
};

/**
 * Resets a workspace by scheduling deletion of its blocks and contracts within
 * a date range and destroying associated orbit data, integrity checks and
 * accounts. Only acts on the workspaceId it is handed; plan/retention selection
 * lives in enforceDataRetentionForWorkspace.js.
 *
 * @param {Object} job - BullMQ job
 * @param {Object} job.data - { workspaceId, from, to }
 * @returns {Promise<string|void>} 'Invalid date range' on a bad window, otherwise void
 * @throws {Error} If a required parameter is missing or the workspace cannot be found
 */
module.exports = async (job) => {
    console.log('workspaceReset');
    const data = job.data;

    if (!data.workspaceId || !data.from || !data.to)
        throw new Error('Missing parameter');

    if (new Date(data.from).getTime() < 0 || new Date(data.to).getTime() < 0 || new Date(data.from) > new Date(data.to))
        return 'Invalid date range';

    const workspace = await Workspace.findByPk(data.workspaceId);
    if (!workspace)
        throw new Error('Cannot find workspace');

    console.log('destroying orbit data for workspace', data.workspaceId);
    await workspace.safeDestroyOrbitData();

    const fromTime = new Date(data.from).getTime();
    const toTime = new Date(data.to).getTime();

    await paginateAndEnqueue(
        workspace.getBlocks.bind(workspace),
        data.workspaceId,
        data.from,
        data.to,
        'batchBlockDelete',
        getMaxBlockForSyncReset(),
        (start, end) => `batchBlockDelete-${data.workspaceId}-${start}-${end}-${fromTime}-${toTime}`
    );

    await paginateAndEnqueue(
        workspace.getContracts.bind(workspace),
        data.workspaceId,
        data.from,
        data.to,
        'batchContractDelete',
        getMaxContractForReset(),
        (start, end) => `batchContractDelete-${data.workspaceId}-${start}-${end}`
    );

    await workspace.safeDestroyIntegrityCheck();
    await workspace.safeDestroyAccounts();
};
