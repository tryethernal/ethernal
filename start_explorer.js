const axios = require('axios');

const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmaXJlYmFzZVVzZXJJZCI6IjEwZGE3Mzc3LWExYzEtNDY0Ny1hM2YxLTI2MTA5MGFhNjk3ZSIsImFwaUtleSI6IlFBUkpYM1gtRTBCTU01Ui1NN1hSNjlELTVYN01XV1RcdTAwMDEiLCJpYXQiOjE2Nzk5NTIyNDR9.aWCJ6lxWcS9eQ0WOneN4tAT1IW-0r1yAzpqkV0sHh_s';
const API_ROOT = 'http://38.242.208.196';
const EXPLORER_SUBDOMAIN = 'jasperpay.io ';
const EXPLORER_SLUG = 'explorer ';
const WORKSPACE_NAME = 'jasper-explorer';
const RPC_SERVER = 'http://3.210.116.153:8546';

const HEADERS = {
    headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
    }
}

async function main() {
    try {
        const workspacePayload = {
            name: WORKSPACE_NAME,
            workspaceData: {
                chain: 'ethereum',
                networkId: 31337,
                rpcServer: RPC_SERVER,
                public: true,
                tracing: 'disabled'
            }
        }

        const workspace = (await axios.post(`${API_ROOT}/api/workspaces`, { data: workspacePayload }, HEADERS)).data;

        const explorerPayload = {
            workspaceId: workspace.id,
            name: WORKSPACE_NAME,
            rpcServer: RPC_SERVER,
            theme: {default:{}},
            token: 'ether',
            domain: `${workspace.name}.${EXPLORER_SUBDOMAIN}`,
            slug: EXPLORER_SLUG,
            chainId: parseInt(workspace.networkId)
        }

        const explorer = (await axios.post(`${API_ROOT}/api/explorers`, { data: explorerPayload }, HEADERS)).data;
        console.log(`https://${payload.domain}`);
    } catch(error) {
        console.log(`Error: ${error.response.data}`);
    }
}

main();