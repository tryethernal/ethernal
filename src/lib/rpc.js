const ethers = require('ethers');
const axios = require('axios');
const { sanitize } = require('./utils');

const ERC721_ABI = require('../abis/erc721.json');
const ERC721_ENUMERABLE_ABI = require('../abis/erc721Enumerable.json');
const ERC721_METADATA_ABI = require('../abis/erc721Metadata.json');

const getProvider = function(url) {
    const rpcServer = new URL(url);

    let provider = ethers.providers.WebSocketProvider;

    if (rpcServer.protocol == 'http:' || rpcServer.protocol == 'https:') {
        provider = ethers.providers.JsonRpcProvider;
    }
    else if (rpcServer.protocol == 'ws:' || rpcServer.protocol == 'wss:') {
        provider = ethers.providers.WebSocketProvider;
    }

    return new provider(url);
};

class ContractConnector {

     INTERFACE_IDS = {
         '721': '0x80ac58cd',
         '721Metadata': '0x5b5e139f',
         '721Enumerable': '0x780e9d63'
     };

    constructor(server, address, abi) {
        if (!server || !address || !abi) throw '[ContractConnector] Missing parameter';
        this.provider = getProvider(server);
        this.contract = new ethers.Contract(address, abi, this.provider);
    }

    async callReadMethod(method, params, options) {
        try {
            return await this.contract.functions[method](...Object.values(params), options);
        } catch(error) {
            return (error.body ? JSON.parse(error.body).error.message : error.reason) || error.message || "Can't connect to the server";
        }
    }

    has721Interface() {
        return this.contract.supportsInterface(this.INTERFACE_IDS['721']);
    }

    has721Metadata() {
        return this.contract.supportsInterface(this.INTERFACE_IDS['721Metadata']);
    }

    has721Enumerable() {
        return this.contract.supportsInterface(this.INTERFACE_IDS['721Enumerable']);
    }

    symbol() {
        return this.contract.symbol();
    }

    name() {
        return this.contract.name();
    }

    async totalSupply() {
        const res = await this.contract.totalSupply();
        return res.toString();
    }
}

class ERC721Connector {

    constructor(server, address, interfaces = {}) {
        if (!server || !address) throw '[ERC721Connector] Missing parameter';

        this.interfaces = {
            metadata: !!interfaces.metadata,
            enumerable: !!interfaces.enumerable
        };

        this.abi = ERC721_ABI;
        this.address = address;
        this.totalSupplyValue = null;

        if (this.interfaces.metadata)
            this.abi = this.abi.concat(ERC721_METADATA_ABI);

        if (this.interfaces.enumerable)
            this.abi = this.abi.concat(ERC721_ENUMERABLE_ABI);

        this.provider = getProvider(server);
        this.contract = new ethers.Contract(address, this.abi, this.provider);
    }

    async totalSupply() {
        const res = await this.contract.totalSupply();
        return res.toString();
    }

    tokenByIndex(index) {
        return this.contract.tokenByIndex(index);
    }

    ownerOf(tokenId) {
        return this.contract.ownerOf(tokenId);
    }

    tokenURI(tokenId) {
        return this.contract.tokenURI(tokenId);
    }

    setSigner(from) {
        const signer = this.provider.getSigner(from);
        return this.contract.connect(signer);
    }

    safeTransferFrom(from, to, tokenId) {
        const signer = this.provider.getSigner(from);
        const contractWithSigner = new ethers.Contract(this.address, this.abi, signer);
        return contractWithSigner['safeTransferFrom(address,address,uint256)'](from, to, ethers.BigNumber.from(tokenId));
    }

    async fetchTokenByIndex(index) {
        if (!this.interfaces.enumerable)
            throw 'This method is only available on ERC721 implemeting the Enumerable interface';

        if (this.totalSupplyValue == null)
            this.totalSupplyValue = await this.totalSupply();

        if (index > this.totalSupplyValue - 1)
            return null;

        const tokenId = await this.tokenByIndex(index);
        const owner = await this.ownerOf(tokenId.toString());
        const URI = await this.tokenURI(tokenId.toString());

        const axiosableURI = URI.startsWith('ipfs://') ?
            `https://ipfs.io/ipfs/${URI.slice(7, URI.length)}` : URI;

        const metadata = (await axios.get(axiosableURI)).data;

        return sanitize({
            tokenId: tokenId.toString(),
            index: index,
            owner: owner,
            URI: URI,
            metadata: metadata
        });
    }
}

module.exports = {
    ContractConnector: ContractConnector,
    ERC721Connector: ERC721Connector,
    getProvider: getProvider
};
