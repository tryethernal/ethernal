var Web3 = require('web3');
var web3 = new Web3();

export default function (amount, to = 'ether') {
    var ethAmount = web3.utils.fromWei(amount.toString(), to).toLocaleString();
    return `${ethAmount} ${to}`;
}
