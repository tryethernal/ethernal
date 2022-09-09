const ethers = require('ethers');

export const sendTransaction = ({ ethereum, address, abi, signature, params, options }) => {
    return new Promise((resolve, reject) => {
        const provider = new ethers.providers.Web3Provider(ethereum, 'any');
        const signer = provider.getSigner();
        const contract = new ethers.Contract(address, abi, signer);
        contract.populateTransaction[signature](...params, options)
            .then(transaction => {
                const params = {
                    ...transaction,
                    value: transaction.value.toHexString()
                };
                window.ethereum.request({
                    method: 'eth_sendTransaction',
                    params: [params]
                })
                .then(resolve)
                .catch(reject);
            })
            .catch(reject);
    });
};
