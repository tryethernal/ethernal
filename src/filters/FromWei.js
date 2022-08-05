const Web3 = require('web3');
const ethers = require('ethers');
const web3 = new Web3();

const BigNumber = ethers.BigNumber;
const formatUnits = ethers.utils.formatUnits;
const commify = ethers.utils.commify;

export default function (amount = 0, to = 'ether', nativeToken = 'ether', decimals, unformatted = false) {
    if (unformatted || !decimals) return amount;

    const ethAmount = BigNumber.from(String(amount));
    const roundedAmount = formatUnits(ethAmount, decimals)

    if (to == 'ether' && nativeToken != 'ether')
        return `${commify(roundedAmount)} ${nativeToken}`;
    else
        return `${roundedAmount} ${to}`;
}
