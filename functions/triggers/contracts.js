const functions = require('firebase-functions');

const { getContractByHashedBytecode } = require('../lib/firebase');
const { sanitize } = require('../lib/utils');

exports.matchWithContract = async (snap, context) => {
    try {
        const newContract = snap.data();

        if (!newContract.hashedBytecode || newContract.abi) {
            return null;
        }
        
        const contract = await getContractByHashedBytecode(context.params.userId, context.params.workspaceName, newContract.hashedBytecode);

        if (contract && (contract.name || contract.abi)) {
            return snap._ref.set(sanitize({ name: contract.name, abi: contract.abi }), { merge: true });
        }

        return null;
    } catch (error) {
        console.log(error);
    }
};
