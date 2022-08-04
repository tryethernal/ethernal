const Web3 = require('web3');
const web3 = new Web3();

export default function (amount = 0, to = 'ether', nativeToken = 'ether', decimals, unformatted = false) {
    if (unformatted) return amount;
    const ethAmount = parseFloat(web3.utils.fromWei(amount.toString(), to).toLocaleString());

    const roundedAmount = decimals ? parseFloat(ethAmount.toFixed(decimals)).toLocaleString() : ethAmount;

    if (to == 'ether' && nativeToken != 'ether')
        return `${roundedAmount} ${nativeToken}`;
    else
        return `${roundedAmount} ${to}`;
}
