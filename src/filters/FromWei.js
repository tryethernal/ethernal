const ethers = require('ethers');

const BigNumber = ethers.BigNumber;
const formatUnits = ethers.utils.formatUnits;
const commify = ethers.utils.commify;

export default function (amount = 0, to = 'ether', nativeToken = 'ether', decimals, unformatted = false) {
    if (unformatted || !decimals) return amount;

    const ethAmount = BigNumber.from(String(amount));
    const roundedAmount = formatUnits(ethAmount, decimals)
    const commified = commify(roundedAmount);
    const formatted = commified.endsWith('.0') ? commified.split('.')[0] : commified;

    if (to == 'ether' && nativeToken != 'ether')
        return `${formatted} ${nativeToken}`;
    else
        return `${roundedAmount} ${to}`;
}
