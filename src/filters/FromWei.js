const ethers = require('ethers');
import { eToNumber, getSignificantDigitCount } from '../lib/utils';

const BigNumber = ethers.BigNumber;
const formatUnits = ethers.utils.formatUnits;
const commify = ethers.utils.commify;

export default function (amount = 0, to, symbol = 'ether', unformatted = false, significantDigits) {
    // Handle null, undefined or invalid inputs safely
    if (amount === null || amount === undefined) {
        return unformatted ? '0' : symbol !== false ? `0 ${symbol}` : '0';
    }
    
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

    if (['wei', 'kwei', 'mwei', 'gwei', 'szabo', 'finney'].indexOf(to) > -1 && !symbol)
        symbol = to;

    let stringedAmount;
    try {
        stringedAmount = typeof amountInt === 'object' && amountInt !== null && typeof amountInt.toLocaleString === 'function' ? 
            amountInt.toLocaleString('fullwide', { useGrouping: false }) : 
            String(amountInt || 0);
    } catch (error) {
        console.error('Error converting amount to string:', error);
        stringedAmount = '0';
    }

    let ethAmount;
    try {
        ethAmount = BigNumber.from(stringedAmount);
    } catch(error) {
        try {
            ethAmount = BigNumber.from(eToNumber(stringedAmount));
        } catch (innerError) {
            console.error('Error converting to BigNumber:', innerError);
            ethAmount = BigNumber.from(0);
        }
    }
    const roundedAmount = formatUnits(ethAmount, to);
    const commified = commify(roundedAmount);
    let formatted = commified.endsWith('.0') ? commified.split('.')[0] : commified;

    if (significantDigits) {
        const parsed = parseFloat(+formatted);
        const sigDigitsCount = Math.max(1, getSignificantDigitCount(eToNumber(parsed)));
        formatted = eToNumber(parsed.toPrecision(sigDigitsCount <= significantDigits ? sigDigitsCount : significantDigits));
    }

    if (!symbol)
        symbol = 'ETH';

    if (symbol !== false) {
        formatted = `${formatted} ${symbol}`;
    }

    return formatted;
}
