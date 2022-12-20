const ethers = require('ethers');

const BigNumber = ethers.BigNumber;
const formatUnits = ethers.utils.formatUnits;
const commify = ethers.utils.commify;

export default function (amount = 0, to, symbol = 'ether', unformatted = false) {
    if (unformatted || !to) return amount;

    if (['wei', 'kwei', 'mwei', 'gwei', 'szabo', 'finney'].indexOf(to) > -1)
        symbol = to;

    let stringedAmount = typeof amount.toLocaleString === 'function' ? amount.toLocaleString('fullwide', { useGrouping:false }) : String(amount);

    const ethAmount = BigNumber.from(stringedAmount);
    const roundedAmount = formatUnits(ethAmount, to)
    const commified = commify(roundedAmount);
    const formatted = commified.endsWith('.0') ? commified.split('.')[0] : commified;

    return `${formatted} ${symbol || 'ether'}`;
}
