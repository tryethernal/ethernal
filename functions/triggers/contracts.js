const functions = require('firebase-functions');

const { getContractByHashedBytecode } = require('../lib/firebase');
const { sanitize } = require('../lib/utils');
const axios = require('axios');

const ETHERSCAN_API_URL = 'https://api.etherscan.io/api?module=contract&action=getsourcecode';

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
            const ETHERSCAN_API_KEY = functions.config().etherscan.token;
            const endpoint = `${ETHERSCAN_API_URL}&address=${newContract.address}&apikey=${ETHERSCAN_API_KEY}`;
            const etherscanData = (await axios.get(endpoint)).data;

            contractData = etherscanData.message != 'NOTOK' && etherscanData.result[0].ContractName != '' ?
                { address: snap.id.toLowerCase(), hashedBytecode: newContract.contractHashedBytecode, name: etherscanData.result[0].ContractName, abi: JSON.parse(etherscanData.result[0].ABI || []) } :
                { address: snap.id.toLowerCase(), hashedBytecode: newContract.contractHashedBytecode };

            return snap._ref.set(sanitize(contractData), { merge: true });
        }

        return null;
    } catch (error) {
        console.log(error);
    }
};
