const axios = require('axios');
const moment = require('moment');

module.exports = async job => {
    const data = job.data;

    if (!data.workspace || !data.email) {
        console.log(data);
        throw '[POST /tasks/submitExplorerLead] Missing parameter.';
    }

    const params = {
        workspace: data.workspace,
        email: data.email,
        createdAt: moment().format('yyyy-MM-DD HH:mm:ss')
    };

    return await axios.post(process.env.EXPLORER_LEAD_SUBMISSION_ENDPOINT, params);
};
