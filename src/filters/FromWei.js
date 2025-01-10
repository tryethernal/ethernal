const ethers = require('ethers');
import { eToNumber, getSignificantDigitCount } from '../lib/utils';

const BigNumber = ethers.BigNumber;
const formatUnits = ethers.utils.formatUnits;
const commify = ethers.utils.commify;

export default function (amount = 0, to, symbol = 'ether', unformatted = false, significantDigits) {
    if (unformatted || !to) return amount;

    let amountInt;
    try {
        let parsedBigNumberAmount = BigNumber.from(JSON.parse(amount))
        if (typeof parsedBigNumberAmount == 'bigint')
            amountInt = parsedBigNumberAmount.toString();
        else
            amountInt = parsedBigNumberAmount;
    } catch(_) {
        amountInt = amount
    }

    if (['wei', 'kwei', 'mwei', 'gwei', 'szabo', 'finney'].indexOf(to) > -1)
        symbol = to;

    let stringedAmount = typeof amountInt.toLocaleString === 'function' ? amountInt.toLocaleString('fullwide', { useGrouping: false }) : String(amountInt);

    let ethAmount;
    try {
        ethAmount = BigNumber.from(stringedAmount);
    } catch(error) {
        ethAmount = BigNumber.from(eToNumber(stringedAmount));
    }
    const roundedAmount = formatUnits(ethAmount, to);
    const commified = commify(roundedAmount);
    let formatted = commified.endsWith('.0') ? commified.split('.')[0] : commified;

    if (significantDigits) {
        const parsed = parseFloat(+formatted);
        const sigDigitsCount = Math.max(1, getSignificantDigitCount(eToNumber(parsed)));
        formatted = eToNumber(parsed.toPrecision(sigDigitsCount <= significantDigits ? sigDigitsCount : significantDigits));
    }

    return `${formatted} ${symbol || 'ether'}`;
}
