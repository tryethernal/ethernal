var Web3 = require('web3');
var web3 = new Web3();

export default function (amount = 0, to = 'ether', nativeToken = 'ether') {
    var ethAmount = web3.utils.fromWei(amount.toString(), to).toLocaleString();

    if (to == 'ether' && nativeToken != 'ether')
        return `${ethAmount} ${nativeToken}`;
    else
        return `${ethAmount} ${to}`;
}
