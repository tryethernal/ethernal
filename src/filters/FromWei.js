const ethers = require('ethers');

const BigNumber = ethers.BigNumber;
const formatUnits = ethers.utils.formatUnits;
const commify = ethers.utils.commify;

export default function (amount = 0, to, symbol = 'ether', unformatted = false) {
    if (unformatted || !to) return amount;

    const ethAmount = BigNumber.from(String(amount));
    const roundedAmount = formatUnits(ethAmount, to)
    const commified = commify(roundedAmount);
    const formatted = commified.endsWith('.0') ? commified.split('.')[0] : commified;

    return `${formatted} ${symbol}`;
}
