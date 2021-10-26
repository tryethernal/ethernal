const functions = require('firebase-functions');

const { getContractByHashedBytecode, getWorkspaceByName } = require('../lib/firebase');
const { sanitize } = require('../lib/utils');
const axios = require('axios');

exports.matchWithContract = async (snap, context) => {
    try {
        const newContract = snap.data();

        if (!newContract.hashedBytecode || newContract.abi) {
            return null;
        }

        const contract = await getContractByHashedBytecode(context.params.userId, context.params.workspaceName, newContract.hashedBytecode, [snap.id]);

        if (contract && (contract.name || contract.abi)) {
            return snap._ref.set(sanitize({ name: contract.name, abi: contract.abi }), { merge: true });
        }
        else {
            const workspace = await getWorkspaceByName(context.params.userId, context.params.workspaceName);
            let scannerHost = 'etherscan.io';
            let apiKey = functions.config().etherscan.token;

            switch (workspace.chain) {
                case 'bsc':
                    scannerHost = 'bscscan.com';
                    apiKey = functions.config().bscscan.token;
                    break;
                case 'matic':
                    scannerHost = 'polygonscan.com';
                    apiKey = functions.config().polygonscan.token;
                    break;
                default:
                break;
            }

            const endpoint = `https://api.${scannerHost}/api?module=contract&action=getsourcecode&address=${newContract.address}&apikey=${apiKey}`;
            const scannerData = (await axios.get(endpoint)).data;

            contractData = scannerData.message != 'NOTOK' && scannerData.result[0].ContractName != '' ?
                { address: snap.id.toLowerCase(), hashedBytecode: newContract.contractHashedBytecode, name: scannerData.result[0].ContractName, abi: JSON.parse(scannerData.result[0].ABI || []) } :
                { address: snap.id.toLowerCase(), hashedBytecode: newContract.contractHashedBytecode };

            return snap._ref.set(sanitize(contractData), { merge: true });
        }

        return null;
    } catch (error) {
        console.log(error);
    }
};
