import * as ethers from 'ethers';

import SELECTORS from '../abis/selectors.json';
import ERC20_ABI from '../abis/erc20.json';
import ERC721_ABI from '../abis/erc721.json';
import ERC721_METADATA_ABI from '../abis/erc721Metadata.json';
import ERC721_ENUMERABLE_ABI from '../abis/erc721Enumerable.json';

import { ContractConnector, ERC721Connector, getProvider } from './rpc.js';
import { sanitize } from './utils.js';

const formatErc721Metadata = (token) => {
    if (!token)
        return null;

    if (!token.metadata)
        return {
            ...token,
            attributes: {
                name: `#${token.tokenId}`,
                image_data: null,
                background_color: null,
                description: null,
                external_url: null,
                properties: [],
                levels: [],
                boosts: [],
                stats: [],
                dates: []
            }
        };

    const name = token.metadata.name || `#${token.tokenId}`;

    let image_data;

    if (token.metadata.image_data)
        image_data = token.metadata.image_data;
    else if (token.metadata.image) {
        const insertableImage = token.metadata.image.startsWith('ipfs://') ?
            `https://ipfs.io/ipfs/${token.metadata.image.slice(7, token.metadata.image.length)}` :
            token.metadata.image;

        image_data = `<img style="height: 100%; width: 100%; object-fit: cover" src="${insertableImage}" />`;
    }

    const traits = token.metadata.attributes || [];

    const properties = traits.filter(metadata => {
        return metadata.value &&
            !metadata.display_type &&
            typeof metadata.value == 'string';
    });

    const levels = traits.filter(metadata => {
        return metadata.value &&
            !metadata.display_type &&
            typeof metadata.value == 'number';
    });

    const boosts = traits.filter(metadata => {
        return metadata.display_type &&
            metadata.value &&
            typeof metadata.value == 'number' &&
            ['boost_number', 'boost_percentage'].indexOf(metadata.display_type) > -1;
    });

    const stats = traits.filter(metadata => {
        return metadata.display_type &&
            metadata.value &&
            typeof metadata.value == 'number' &&
            metadata.display_type == 'number';
    });

    const dates = traits.filter(metadata => {
        return metadata.display_type &&
            metadata.display_type == 'date';
    });

    const attributes = { background_color: token.metadata.background_color || null, name, image_data, external_url: token.metadata.external_url || null, description: token.metadata.description || null, properties, levels, boosts, stats, dates };

    return {
        attributes,
        ...token
    };
};

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
            totalSupply = res[3] && res[3].toString();
        }).catch(console.log);

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

        if (patterns.indexOf('erc721') == -1) {
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

            const erc721Connector = new ERC721Connector(rpcServer, contractAddress, { metadata: has721Metadata, enumerable: has721Enumerable });
            symbol = await erc721Connector.symbol();
            name = await erc721Connector.name();
            totalSupply = await erc721Connector.totalSupply();

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
            has721Metadata: !!has721Metadata,
            has721Enumerable: !!has721Enumerable
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

export {
    isErc20,
    isErc721,
    findPatterns,
    formatErc721Metadata
};
