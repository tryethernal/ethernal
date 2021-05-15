const functions = require('firebase-functions');

const { getContractByHashedBytecode } = require('../lib/firebase');

exports.matchWithContract = async (snap, context) => {
    try {
        const newContract = snap.data();

        if (!newContract.hashedBytecode || newContract.abi) {
            return true;
        }
        
        const contract = await getContractByHashedBytecode(context.params.userId, context.params.workspaceName, newContract.hashedBytecode);

        if (contract) {
            await snap._ref.set({ name: contract.name, abi: contract.abi }, { merge: true });
        }

        return true;
    } catch (error) {
        console.log(error);
    }
};
