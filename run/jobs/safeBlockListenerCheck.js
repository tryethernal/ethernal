const { Op } = require('sequelize');
const { getPm2Host, getPm2Secret } = require('../lib/env');
const { OrbitChainConfig } = require('../models');
const PM2 = require('../lib/pm2');

module.exports = async () => {
    const orbitParentConfigs = await OrbitChainConfig.findAll({
        where: {
            topParentChainBlockValidationType: {
                [Op.in]: ['SAFE', 'FINALIZED']
            }
        }
    });

    const pm2 = new PM2(getPm2Host(), getPm2Secret());

    const existingProcesses = [];
    const newProcesses = [];
    for (const config of orbitParentConfigs) {
        const parentWorkspace = await config.getTopParentWorkspace();
        const explorer = await parentWorkspace.getExplorer();

        const { data: existingProcess } = await pm2.find(`safeBlockListener-${explorer.slug}`);

        if (existingProcess)
            existingProcesses.push(explorer.slug);
        else {
            await pm2.startSafeBlockListener(explorer.slug, parentWorkspace.id);
            newProcesses.push(explorer.slug);
        }
    }

    return { newProcesses, existingProcesses };
};
