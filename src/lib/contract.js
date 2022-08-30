 const ethers = require('ethers');

const SELECTORS = require('../abis/selectors.json');
const ERC20_ABI = require('../abis/erc20.json');
const ERC721_ABI = require('../abis/erc721.json');
const ERC721_METADATA_ABI = require('../abis/erc721Metadata.json');
const ERC721_ENUMERABLE_ABI = require('../abis/erc721Enumerable.json');

const { ContractConnector, getProvider } = require('./rpc');
const { sanitize } = require('./utils');

const findPatterns = async (rpcServer, contractAddress, abi) => {
    try {
        let decimals, symbol, name, totalSupply, promises = [], patterns = [], tokenData = {}, has721Metadata, has721Enumerable;

        const provider = getProvider(rpcServer);
        const erc20contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

        promises.push(erc20contract.decimals());
        promises.push(erc20contract.symbol());
        promises.push(erc20contract.name());
        promises.push(erc20contract.totalSupply());

        await Promise.all(promises).then(res => {
            decimals = res[0];
            symbol = res[1];
            name = res[2];
        }).catch(() => {});

        if (decimals && symbol && name) {
            tokenData = sanitize({
                decimals: decimals,
                symbol: symbol,
                name: name,
                totalSupply: totalSupply
            });

            patterns.push('erc20');

            if (abi && !isErc20(abi))
                patterns.push('proxy')
        }

        if (abi && isErc721(abi))
            patterns.push('erc721')

        const contract = new ContractConnector(rpcServer, contractAddress, [...ERC721_ABI, ...ERC721_ENUMERABLE_ABI, ...ERC721_METADATA_ABI]);

        if (!abi) {
            try {
                const isErc721 = await contract.has721Interface();
                if (isErc721)
                    patterns.push('erc721');
            } catch(error) {
                console.log(error);
            }
        }

        if (patterns.indexOf('erc721') > -1) {
            has721Metadata = await contract.has721Metadata();
            has721Enumerable = await contract.has721Enumerable();
            symbol = has721Metadata ? await contract.symbol() : null;
            name = has721Metadata ? await contract.name() : null;
            totalSupply = has721Enumerable ? await contract.totalSupply() : null;

            tokenData = sanitize({
                symbol: symbol,
                name: name,
                totalSupply: totalSupply
            });
        }

        return {
            patterns: patterns,
            tokenSymbol: tokenData.symbol,
            tokenName: tokenData.name,
            tokenDecimals: tokenData.decimals,
            totalSupply: tokenData.totalSupply,
            has721Metadata: has721Metadata,
            has721Enumerable: has721Enumerable
        };
    } catch(error) {
        console.log(error);
        return {};
    }
};

const findSelectors = (abi, pattern) => {
    try {
        const iface = new ethers.utils.Interface(abi);

        for (let i = 0; i < pattern.functions.length; i++) {
            try {
                iface.getFunction(pattern.functions[i]);
            } catch (_) {
                console.log(_)
                return false;
            }
        }

        for (let i = 0; i < pattern.events.length; i++) {
            try {
                iface.getEvent(pattern.events[i]);
            } catch (_) {
                console.log(_)
                return false;
            }
        }

        for (let i = 0; i < pattern.errors.length; i++) {
            try {
                iface.getError(pattern.errors[i]);
            } catch (_) {
                console.log(_)
                return false;
            }
        }

        return true;
    } catch(error) {
        console.log(error)
        return false;
    }
};

const isErc20 = (abi) => {
    return findSelectors(abi, SELECTORS.erc20);
};

const isErc721 = (abi) => {
    return findSelectors(abi, SELECTORS.erc721);
};

module.exports = {
    isErc20: isErc20,
    isErc721: isErc721,
    findPatterns: findPatterns
};
